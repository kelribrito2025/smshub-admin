import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { router } from '../_core/trpc';
import { adminProcedure } from '../admin-middleware';
import {
  getAllPrices,
  getPricesByCountry,
  getPricesByService,
  getPriceByCountryAndService,
  upsertPrice,
  updatePrice,
  deletePrice,
  getCountryById,
  getServiceById,
  updateCountry,
  updateService,
  createService,
} from '../db-helpers';
import { getDb } from '../db';
import { prices } from '../../drizzle/schema';
import { getServiceName } from '../../shared/service-names';

export const pricesRouter = router({
  /**
   * Get all prices with country and service details (with pagination)
   */
  getAll: adminProcedure
    .input(
      z.object({
        page: z.number().min(1).default(1),
        pageSize: z.number().min(10).max(100).default(50),
        searchTerm: z.string().optional(),
        filterCountry: z.string().optional(),
        filterStatus: z.string().optional(),
        filterApi: z.string().optional(),
      }).optional()
    )
    .query(async ({ input }) => {
      const allPrices = await getAllPrices();
      
      // If no pagination input, return all (backward compatibility)
      if (!input) {
        return {
          items: allPrices,
          total: allPrices.length,
          page: 1,
          pageSize: allPrices.length,
          totalPages: 1,
        };
      }
      
      const { page, pageSize, searchTerm, filterCountry, filterStatus, filterApi } = input;
      
      // Apply filters
      let filteredPrices = allPrices;
      
      // Search filter
      if (searchTerm && searchTerm.trim() !== '') {
        const term = searchTerm.toLowerCase();
        filteredPrices = filteredPrices.filter((item: any) => {
          const countryName = item.country?.name?.toLowerCase() || '';
          const serviceName = item.service?.name?.toLowerCase() || '';
          const serviceCode = item.service?.smshubCode?.toLowerCase() || '';
          return countryName.includes(term) || serviceName.includes(term) || serviceCode.includes(term);
        });
      }
      
      // Country filter
      if (filterCountry && filterCountry !== 'all') {
        filteredPrices = filteredPrices.filter((item: any) => item.country?.code === filterCountry);
      }
      
      // Status filter
      if (filterStatus && filterStatus !== 'all') {
        if (filterStatus === 'active') {
          filteredPrices = filteredPrices.filter((item: any) => item.price?.active === true);
        } else if (filterStatus === 'inactive') {
          filteredPrices = filteredPrices.filter((item: any) => item.price?.active === false);
        }
      }
      
      // API filter
      if (filterApi && filterApi !== 'all') {
        const apiId = parseInt(filterApi);
        filteredPrices = filteredPrices.filter((item: any) => item.price?.apiId === apiId);
      }
      
      // Paginate filtered results
      const startIndex = (page - 1) * pageSize;
      const endIndex = startIndex + pageSize;
      const paginatedItems = filteredPrices.slice(startIndex, endIndex);
      
      return {
        items: paginatedItems,
        total: filteredPrices.length,
        page,
        pageSize,
        totalPages: Math.ceil(filteredPrices.length / pageSize),
      };
    }),

  /**
   * Get prices by country
   */
  getByCountry: adminProcedure
    .input(z.object({ countryId: z.number() }))
    .query(async ({ input }) => {
      return getPricesByCountry(input.countryId);
    }),

  /**
   * Get prices by service
   */
  getByService: adminProcedure
    .input(z.object({ serviceId: z.number() }))
    .query(async ({ input }) => {
      return getPricesByService(input.serviceId);
    }),

  /**
   * Get specific price
   */
  getOne: adminProcedure
    .input(
      z.object({
        countryId: z.number(),
        serviceId: z.number(),
      })
    )
    .query(async ({ input }) => {
      return getPriceByCountryAndService(input.countryId, input.serviceId);
    }),

  /**
   * Create or update a price
   */
  upsert: adminProcedure
    .input(
      z.object({
        countryId: z.number(),
        serviceId: z.number(),
        smshubPrice: z.number().min(0),
        ourPrice: z.number().min(0),
        quantityAvailable: z.number().min(0).default(0),
      })
    )
    .mutation(async ({ input }) => {
      await upsertPrice({
        countryId: input.countryId,
        serviceId: input.serviceId,
        smshubPrice: input.smshubPrice,
        ourPrice: input.ourPrice,
        quantityAvailable: input.quantityAvailable,
      });

      return { success: true };
    }),

  /**
   * Update only our selling price
   */
  updateOurPrice: adminProcedure
    .input(
      z.object({
        countryId: z.number(),
        serviceId: z.number(),
        ourPrice: z.number().min(0),
      })
    )
    .mutation(async ({ input }) => {
      const existing = await getPriceByCountryAndService(input.countryId, input.serviceId);
      if (!existing) {
        throw new Error('Price not found');
      }

      await upsertPrice({
        countryId: input.countryId,
        serviceId: input.serviceId,
        smshubPrice: existing.price.smshubPrice,
        ourPrice: input.ourPrice,
        quantityAvailable: existing.price.quantityAvailable,
      });

      return { success: true };
    }),

  /**
   * Toggle active status for a price (country+service combination)
   */
  toggleActive: adminProcedure
    .input(
      z.object({
        priceId: z.number(),
        active: z.boolean(),
      })
    )
    .mutation(async ({ input }) => {
      const priceData = await getAllPrices();
      const price = priceData.find((p) => p.price.id === input.priceId);
      
      if (!price) {
        throw new Error('Price not found');
      }

      // Update only the specific price record
      await updatePrice(input.priceId, { active: input.active });

      return { success: true };
    }),

  /**
   * Create service and price manually
   */
  createManual: adminProcedure
    .input(
      z.object({
        countryId: z.number(),
        serviceName: z.string().min(1),
        serviceCode: z.string().min(1),
        category: z.string().default('Other'),
        apiId: z.number(),
        smshubPrice: z.number().min(0),
        ourPrice: z.number().min(0),
        quantityAvailable: z.number().min(0).default(0),
        active: z.boolean().default(true),
      })
    )
    .mutation(async ({ input }) => {
      // Create or get service
      const service = await createService({
        name: input.serviceName,
        smshubCode: input.serviceCode,
        category: input.category,
        active: input.active,
      });

      // Create price (direct INSERT for manual creation, not UPSERT)
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
      
      await db.insert(prices).values({
        countryId: input.countryId,
        serviceId: service.id,
        apiId: input.apiId,
        smshubPrice: input.smshubPrice,
        ourPrice: input.ourPrice,
        quantityAvailable: input.quantityAvailable,
      });

      return { success: true, service };
    }),

  /**
   * Edit existing service and price
   */
  editService: adminProcedure
    .input(
      z.object({
        priceId: z.number(),
        serviceName: z.string().min(1),
        serviceCode: z.string().min(1),
        smshubPrice: z.number().min(0),
        ourPrice: z.number().min(0),
        fixedPrice: z.boolean(),
        quantityAvailable: z.number().min(0).default(0),
        active: z.boolean(),
      })
    )
    .mutation(async ({ input }) => {
      // Get existing price to find countryId and serviceId
      const allPrices = await getAllPrices();
      const priceData = allPrices.find((p) => p.price.id === input.priceId);
      
      if (!priceData) {
        throw new Error('Price not found');
      }

      const { countryId, serviceId } = priceData.price;

      // Update service details
      await updateService(serviceId, {
        name: input.serviceName,
        smshubCode: input.serviceCode,
        active: input.active,
      });

      // Update price
      await updatePrice(input.priceId, {
        smshubPrice: input.smshubPrice,
        ourPrice: input.ourPrice,
        fixedPrice: input.fixedPrice,
        quantityAvailable: input.quantityAvailable,
      });

      return { success: true };
    }),

  /**
   * Import all services from SMSHub API for a specific country
   */
  importCountryServices: adminProcedure
    .input(
      z.object({
        apiId: z.number(),
        countryId: z.number(),
        priceMultiplier: z.number().min(1).default(2), // Multiplier for our price (default 2x)
      })
    )
    .mutation(async ({ input }) => {
      const { SMSHubClient } = await import('../smshub-client');
      const { getApiById } = await import('../db-helpers');
      
      // Get API details
      const api = await getApiById(input.apiId);
      if (!api) {
        throw new Error('API not found');
      }
      
      // Validate API is active
      if (!api.active) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `Esta API está inativa e não pode receber novos serviços. Por favor, ative a API "${api.name}" antes de importar serviços.`
        });
      }
      
      if (!api.token) {
        throw new Error(`API token not configured for ${api.name}`);
      }

      // Get country details
      const country = await getCountryById(input.countryId);
      if (!country) {
        throw new Error('Country not found');
      }

      if (!country.smshubId) {
        throw new Error('Country does not have SMSHub ID configured');
      }

      // Fetch ALL prices from API (country filter doesn't work as expected)
      const client = new SMSHubClient(api.token, api.url);
      const pricesData = await client.getPrices();
      
      console.log(`[Import] API ${api.name} (ID: ${api.id}) - Total countries in response:`, Object.keys(pricesData).length);
      console.log(`[Import] Looking for country ${country.smshubId} (${country.name})`);
      console.log(`[Import] Available countries:`, Object.keys(pricesData).slice(0, 10));

      const results = {
        total: 0,
        created: 0,
        updated: 0,
        skipped: 0,
        errors: [] as string[],
      };

      // Process each service found in the API response
      // Filter only services for the selected country
      for (const [countryCode, services] of Object.entries(pricesData)) {
        // Skip if not the selected country (countryCode is string, smshubId is number)
        if (countryCode !== String(country.smshubId)) {
          continue;
        }
        
        console.log(`[Import] Found country ${countryCode}, processing ${Object.keys(services).length} services...`);
        console.log(`[Import] First 10 services:`, Object.keys(services).slice(0, 10));

        for (const [serviceCode, priceData] of Object.entries(services)) {
          results.total++;

          try {
            // Get the price (first price in the object)
            const priceEntries = Object.entries(priceData);
            if (priceEntries.length === 0) {
              console.log(`[Import] Skipping ${serviceCode}: no price entries`);
              continue;
            }

            // APIs can return two different formats:
            // Format 1 (SMSHub): {"0.0181": 17408, "0.0183": 1, "0.0187": 129}
            // Format 2 (SMSActivate): {"cost": 0.3, "count": 588495, "physicalCount": 37080}
            
            let priceValue: string | number | undefined;
            let quantity: number = 0;
            
            // Log raw data for debugging (only first 3 services)
            if (results.total <= 3) {
              console.log(`[Import] Service ${serviceCode} raw data:`, JSON.stringify(priceData));
            }
            
            if (typeof priceData === 'object' && priceData !== null) {
              // Check if it's Format 2 (SMSActivate) with 'cost' and 'count' fields
              if ('cost' in priceData && 'count' in priceData) {
                const cost = priceData.cost;
                const count = priceData.count;
                
                if (typeof cost === 'number' && cost > 0) {
                  priceValue = cost;
                  quantity = typeof count === 'number' ? count : 0;
                }
              } else {
                // Format 1 (SMSHub) - extract from key-value pairs
                const entries = Object.entries(priceData);
                
                if (entries.length > 0) {
                  // Extract all prices and quantities
                  const pricesAndQuantities = entries.map(([price, qty]) => ({
                    price: parseFloat(String(price)),
                    quantity: typeof qty === 'number' ? qty : 0
                  })).filter(item => !isNaN(item.price) && item.price > 0);
                  
                  if (pricesAndQuantities.length > 0) {
                    // Use the lowest price (best deal for customers)
                    priceValue = Math.min(...pricesAndQuantities.map(p => p.price));
                    
                    // Sum all quantities to get total availability
                    quantity = pricesAndQuantities.reduce((sum, item) => sum + item.quantity, 0);
                  }
                }
              }
            }
            
            // Validate and convert price to number
            if (priceValue === undefined || priceValue === null || priceValue === 'cost' || priceValue === '') {
              // Service not available or invalid format - skip silently
              results.skipped++;
              continue;
            }
            
            // Convert to number (handle both string and number types)
            const parsedPrice = typeof priceValue === 'number' ? priceValue : parseFloat(String(priceValue));
            if (isNaN(parsedPrice) || parsedPrice <= 0) {
              // Invalid price value - skip silently
              results.skipped++;
              continue;
            }
            
            // API retorna valores em REAIS (ex: 0.70 = R$ 0,70)
            // Converter para centavos multiplicando por 100
            const smshubPrice = Math.round(parsedPrice * 100);
            
            // Calcular preço final usando configuração da API
            const { calculateFinalPrice } = await import('../price-calculator');
            const ourPrice = calculateFinalPrice(
              smshubPrice,
              api.profitPercentage || 0,
              api.minimumPrice || 0,
              api.currency || 'BRL',
              api.exchangeRate || 1.0
            );
            
            console.log(`[Import] ${serviceCode}: price=${priceValue} -> smshubPrice=${smshubPrice}, ourPrice=${ourPrice}`);

            // Try to find service by code
            const { getAllServices } = await import('../db-helpers');
            const allServices = await getAllServices();
            let service = allServices.find(s => s.smshubCode === serviceCode);

            if (!service) {
              // Create new service
              service = await createService({
                name: getServiceName(serviceCode),
                smshubCode: serviceCode,
                category: 'Other',
                active: true,
              });
              results.created++;
            } else {
              results.updated++;
            }

            // Upsert price
            await upsertPrice({
              apiId: input.apiId,
              countryId: input.countryId,
              serviceId: service.id,
              smshubPrice,
              ourPrice,
              quantityAvailable: quantity,
            });
          } catch (error: any) {
            results.errors.push(`${serviceCode}: ${error.message}`);
          }
        }
      }

      return results;
    }),

  /**
   * Delete a price entry
   */
  delete: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await deletePrice(input.id);
      return { success: true };
    }),
});
