import { z } from 'zod';
import { router } from '../_core/trpc';
import { adminProcedure } from '../admin-middleware';
import { getSetting } from '../db-helpers';
import { getDb } from '../db';
import { getServiceName } from '../../shared/service-names';
import { SMSHubClient } from '../smshub-client';
import { SMSHubMultiClient } from '../smshub-multi-client';
import {
  upsertCountry,
  upsertService,
  upsertOperator,
  upsertPrice,
  getCountryBySmshubId,
  getServiceByCode,
  getAllCountries,
  getAllServices,
} from '../db-helpers';
import { smsApis, prices } from '../../drizzle/schema';
import { eq, and } from 'drizzle-orm';

// Hardcoded list of countries from SMSHub API documentation
const SMSHUB_COUNTRIES = [
  { id: 1, name: 'Ukraine', code: 'ukraine' },
  { id: 2, name: 'Kazakhstan', code: 'kazakhstan' },
  { id: 3, name: 'China', code: 'china' },
  { id: 4, name: 'Philippines', code: 'philippines' },
  { id: 5, name: 'Myanmar', code: 'myanmar' },
  { id: 6, name: 'Indonesia', code: 'indonesia' },
  { id: 7, name: 'Malaysia', code: 'malaysia' },
  { id: 8, name: 'Kenya', code: 'kenya' },
  { id: 16, name: 'England', code: 'england' },
  { id: 22, name: 'India', code: 'india' },
  { id: 33, name: 'Colombia', code: 'colombia' },
  { id: 36, name: 'Canada', code: 'canada' },
  { id: 43, name: 'Germany', code: 'germany' },
  { id: 48, name: 'Netherlands', code: 'netherlands' },
  { id: 52, name: 'Thailand', code: 'thailand' },
  { id: 56, name: 'Spain', code: 'spain' },
  { id: 62, name: 'Turkey', code: 'turkey' },
  { id: 67, name: 'Brazil', code: 'brazil' },
  { id: 187, name: 'USA', code: 'usa' },
];

// Common service categories
const SERVICE_CATEGORIES: Record<string, string> = {
  wa: 'Social',
  tg: 'Social',
  vk: 'Social',
  fb: 'Social',
  ig: 'Social',
  go: 'Email',
  ya: 'Email',
  ma: 'Email',
  uk: 'Finance',
  vi: 'Finance',
  pp: 'Finance',
  am: 'Shopping',
  ot: 'Other',
};

export const syncRouter = router({
  /**
   * Sync countries from hardcoded list
   */
  syncCountries: adminProcedure.mutation(async () => {
    let imported = 0;
    let updated = 0;

    for (const country of SMSHUB_COUNTRIES) {
      const existing = await getCountryBySmshubId(country.id);

      await upsertCountry({
        smshubId: country.id,
        name: country.name,
        code: country.code,
        active: existing?.active ?? true,
        markupPercentage: existing?.markupPercentage ?? 0,
        markupFixed: existing?.markupFixed ?? 0,
      });

      if (existing) {
        updated++;
      } else {
        imported++;
      }
    }

    return {
      success: true,
      imported,
      updated,
      total: SMSHUB_COUNTRIES.length,
    };
  }),

  /**
   * Sync prices from SMSHub API
   */
  syncPrices: adminProcedure.mutation(async () => {
    const apiKeySetting = await getSetting('smshub_api_key');
    if (!apiKeySetting || !apiKeySetting.value) {
      throw new Error('SMSHub API key not configured');
    }

    const client = new SMSHubClient(apiKeySetting.value);
    const pricesData = await client.getPrices();

    let imported = 0;
    let updated = 0;
    let servicesCreated = 0;

    // Get default markup settings
    const defaultMarkupPercentage = parseInt((await getSetting('default_markup_percentage'))?.value || '0');
    const defaultMarkupFixed = parseInt((await getSetting('default_markup_fixed'))?.value || '0');

    // Process each country
    for (const [countryCode, countryData] of Object.entries(pricesData)) {
      // Find country in database
      const countries = await getAllCountries();
      const country = countries.find(c => c.code.toLowerCase() === countryCode.toLowerCase());

      if (!country) {
        console.warn(`Country not found: ${countryCode}`);
        continue;
      }

      // Process each service
      for (const [serviceCode, servicePrices] of Object.entries(countryData)) {
        // Get or create service
        let service = await getServiceByCode(serviceCode);

        if (!service) {
          // Create new service
          const category = SERVICE_CATEGORIES[serviceCode] || 'Other';
          await upsertService({
            smshubCode: serviceCode,
            name: getServiceName(serviceCode),
            category,
            active: true,
            markupPercentage: defaultMarkupPercentage,
            markupFixed: defaultMarkupFixed,
          });

          service = await getServiceByCode(serviceCode);
          servicesCreated++;
        }

        if (!service) continue;

        // Process prices
        for (const [priceStr, quantity] of Object.entries(servicePrices)) {
          const smshubPrice = Math.round(parseFloat(priceStr) * 100); // Convert to cents

          // Calculate our price with markup
          const serviceMarkupPercentage = service.markupPercentage || defaultMarkupPercentage;
          const serviceMarkupFixed = service.markupFixed || defaultMarkupFixed;
          const countryMarkupPercentage = country.markupPercentage || 0;
          const countryMarkupFixed = country.markupFixed || 0;

          // Apply both service and country markups
          let ourPrice = smshubPrice;
          ourPrice += Math.round(ourPrice * (serviceMarkupPercentage / 100));
          ourPrice += serviceMarkupFixed;
          ourPrice += Math.round(ourPrice * (countryMarkupPercentage / 100));
          ourPrice += countryMarkupFixed;

          await upsertPrice({
            countryId: country.id,
            serviceId: service.id,
            smshubPrice,
            ourPrice,
            quantityAvailable: quantity,
            lastSync: new Date(),
          });

          imported++;
        }
      }
    }

    return {
      success: true,
      pricesImported: imported,
      servicesCreated,
    };
  }),

  /**
   * Sync availability from SMSHub API
   */
  syncAvailability: adminProcedure.mutation(async () => {
    const apiKeySetting = await getSetting('smshub_api_key');
    if (!apiKeySetting || !apiKeySetting.value) {
      throw new Error('SMSHub API key not configured');
    }

    const client = new SMSHubClient(apiKeySetting.value);
    
    // Get all active countries
    const countries = await getAllCountries(true);
    let updated = 0;

    for (const country of countries) {
      try {
        const availability = await client.getNumbersStatus(country.smshubId);

        // Update quantities for each service
        for (const [serviceKey, quantity] of Object.entries(availability)) {
          // Extract service code (before underscore)
          const serviceCode = serviceKey.split('_')[0];
          const service = await getServiceByCode(serviceCode);

          if (service) {
            // Update quantity in prices table
            const existingPrice = await upsertPrice({
              countryId: country.id,
              serviceId: service.id,
              smshubPrice: 0, // Will be updated by syncPrices
              ourPrice: 0,
              quantityAvailable: quantity,
              lastSync: new Date(),
            });
            updated++;
          }
        }
      } catch (error) {
        console.error(`Failed to sync availability for ${country.name}:`, error);
      }
    }

    return {
      success: true,
      updated,
    };
  }),

  /**
   * Full sync - countries, prices, and availability
   */
  fullSync: adminProcedure.mutation(async () => {
    const apiKeySetting = await getSetting('smshub_api_key');
    if (!apiKeySetting || !apiKeySetting.value) {
      throw new Error('SMSHub API key not configured');
    }

    // Sync countries
    let countriesImported = 0;
    let countriesUpdated = 0;
    for (const country of SMSHUB_COUNTRIES) {
      const existing = await getCountryBySmshubId(country.id);
      await upsertCountry({
        smshubId: country.id,
        name: country.name,
        code: country.code,
        active: existing?.active ?? true,
        markupPercentage: existing?.markupPercentage ?? 0,
        markupFixed: existing?.markupFixed ?? 0,
      });
      if (existing) countriesUpdated++; else countriesImported++;
    }

    // Sync prices
    const client = new SMSHubClient(apiKeySetting.value);
    const pricesData = await client.getPrices();
    let pricesImported = 0;
    let servicesCreated = 0;

    const defaultMarkupPercentage = parseInt((await getSetting('default_markup_percentage'))?.value || '0');
    const defaultMarkupFixed = parseInt((await getSetting('default_markup_fixed'))?.value || '0');

    for (const [countryCode, countryData] of Object.entries(pricesData)) {
      const countries = await getAllCountries();
      const country = countries.find(c => c.code.toLowerCase() === countryCode.toLowerCase());
      if (!country) continue;

      for (const [serviceCode, servicePrices] of Object.entries(countryData)) {
        let service = await getServiceByCode(serviceCode);
        if (!service) {
          const category = SERVICE_CATEGORIES[serviceCode] || 'Other';
          await upsertService({
            smshubCode: serviceCode,
            name: getServiceName(serviceCode),
            category,
            active: true,
            markupPercentage: defaultMarkupPercentage,
            markupFixed: defaultMarkupFixed,
          });
          service = await getServiceByCode(serviceCode);
          servicesCreated++;
        }
        if (!service) continue;

        for (const [priceStr, quantity] of Object.entries(servicePrices)) {
          const smshubPrice = Math.round(parseFloat(priceStr) * 100);
          const serviceMarkupPercentage = service.markupPercentage || defaultMarkupPercentage;
          const serviceMarkupFixed = service.markupFixed || defaultMarkupFixed;
          const countryMarkupPercentage = country.markupPercentage || 0;
          const countryMarkupFixed = country.markupFixed || 0;

          let ourPrice = smshubPrice;
          ourPrice += Math.round(ourPrice * (serviceMarkupPercentage / 100));
          ourPrice += serviceMarkupFixed;
          ourPrice += Math.round(ourPrice * (countryMarkupPercentage / 100));
          ourPrice += countryMarkupFixed;

          await upsertPrice({
            countryId: country.id,
            serviceId: service.id,
            smshubPrice,
            ourPrice,
            quantityAvailable: quantity,
            lastSync: new Date(),
          });
          pricesImported++;
        }
      }
    }

    return {
      success: true,
      countries: { imported: countriesImported, updated: countriesUpdated },
      prices: { imported: pricesImported, servicesCreated },
    };
  }),

  /**
   * Import all services from a specific API with custom markup
   */
  importAllServicesFromApi: adminProcedure
    .input(z.object({
      apiId: z.number(),
      markupPercentage: z.number().default(100),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error('Database connection failed');

      // Get API details
      const api = await db.select().from(smsApis).where(eq(smsApis.id, input.apiId)).limit(1);
      if (!api || api.length === 0) {
        throw new Error(`API with ID ${input.apiId} not found`);
      }

      const apiData = api[0];
      if (!apiData.active) {
        throw new Error(`API ${apiData.name} is not active`);
      }

      // Create client for this specific API
      const client = new SMSHubClient(apiData.token, apiData.url);
      const pricesData = await client.getPrices();

      let imported = 0;
      let updated = 0;
      let servicesCreated = 0;

      // Process each country
      for (const [countryCode, countryData] of Object.entries(pricesData)) {
        const countries = await getAllCountries();
        const country = countries.find(c => c.code.toLowerCase() === countryCode.toLowerCase());

        if (!country) {
          console.warn(`Country not found: ${countryCode}`);
          continue;
        }

        // Process each service
        for (const [serviceCode, servicePrices] of Object.entries(countryData as Record<string, Record<string, number>>)) {
          let service = await getServiceByCode(serviceCode);

          if (!service) {
            const category = SERVICE_CATEGORIES[serviceCode] || 'Other';
            await upsertService({
              smshubCode: serviceCode,
              name: getServiceName(serviceCode),
              category,
              active: true,
              markupPercentage: 0,
              markupFixed: 0,
            });

            service = await getServiceByCode(serviceCode);
            servicesCreated++;
          }

          if (!service) continue;

          // Process prices
          for (const [priceStr, quantity] of Object.entries(servicePrices as Record<string, number>)) {
            const smshubPrice = Math.round(parseFloat(priceStr) * 100);

            // Calcular preço final usando configuração da API
            const { calculateFinalPrice } = await import('../price-calculator');
            const ourPrice = calculateFinalPrice(
              smshubPrice,
              apiData.profitPercentage || 0,
              apiData.minimumPrice || 0,
              apiData.currency || 'BRL',
              apiData.exchangeRate || 1.0
            );

            // Check if price already exists for this API
            const existingPrices = await db
              .select()
              .from(prices)
              .where(
                and(
                  eq(prices.countryId, country.id),
                  eq(prices.serviceId, service.id),
                  eq(prices.apiId, input.apiId)
                )
              )
              .limit(1);

            if (existingPrices.length > 0) {
              // Update existing price
              await db
                .update(prices)
                .set({
                  smshubPrice,
                  ourPrice,
                  quantityAvailable: quantity as number,
                  lastSync: new Date(),
                })
                .where(eq(prices.id, existingPrices[0].id));
              updated++;
            } else {
              // Insert new price
              await db.insert(prices).values({
                apiId: input.apiId,
                countryId: country.id,
                serviceId: service.id,
                smshubPrice,
                ourPrice,
                quantityAvailable: quantity as number,
                lastSync: new Date(),
                createdAt: new Date(),
              });
              imported++;
            }
          }
        }
      }

      return {
        success: true,
        apiName: apiData.name,
        pricesImported: imported,
        pricesUpdated: updated,
        servicesCreated,
      };
    }),

  /**
   * Sync prices from a specific API
   */
  syncPricesByApi: adminProcedure
    .input(z.object({
      apiId: z.number(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error('Database connection failed');

      // Get API details
      const api = await db.select().from(smsApis).where(eq(smsApis.id, input.apiId)).limit(1);
      if (!api || api.length === 0) {
        throw new Error(`API with ID ${input.apiId} not found`);
      }

      const apiData = api[0];
      if (!apiData.active) {
        throw new Error(`API ${apiData.name} is not active`);
      }

      // Create client for this specific API
      const client = new SMSHubClient(apiData.token, apiData.url);
      const pricesData = await client.getPrices();

      let imported = 0;
      let updated = 0;
      let servicesCreated = 0;

      // Get default markup settings
      const defaultMarkupPercentage = parseInt((await getSetting('default_markup_percentage'))?.value || '0');
      const defaultMarkupFixed = parseInt((await getSetting('default_markup_fixed'))?.value || '0');

      // Process each country
      for (const [countryCode, countryData] of Object.entries(pricesData)) {
        const countries = await getAllCountries();
        const country = countries.find(c => c.code.toLowerCase() === countryCode.toLowerCase());

        if (!country) {
          console.warn(`Country not found: ${countryCode}`);
          continue;
        }

        // Process each service
        for (const [serviceCode, servicePrices] of Object.entries(countryData as Record<string, Record<string, number>>)) {
          let service = await getServiceByCode(serviceCode);

          if (!service) {
            const category = SERVICE_CATEGORIES[serviceCode] || 'Other';
            await upsertService({
              smshubCode: serviceCode,
              name: getServiceName(serviceCode),
              category,
              active: true,
              markupPercentage: defaultMarkupPercentage,
              markupFixed: defaultMarkupFixed,
            });

            service = await getServiceByCode(serviceCode);
            servicesCreated++;
          }

          if (!service) continue;

          // Process prices
          for (const [priceStr, quantity] of Object.entries(servicePrices as Record<string, number>)) {
            const smshubPrice = Math.round(parseFloat(priceStr) * 100);

            // Calcular preço final usando configuração da API
            const { calculateFinalPrice } = await import('../price-calculator');
            const ourPrice = calculateFinalPrice(
              smshubPrice,
              apiData.profitPercentage || 0,
              apiData.minimumPrice || 0,
              apiData.currency || 'BRL',
              apiData.exchangeRate || 1.0
            );

            // Check if price already exists for this API
            const existingPrices = await db
              .select()
              .from(prices)
              .where(
                and(
                  eq(prices.countryId, country.id),
                  eq(prices.serviceId, service.id),
                  eq(prices.apiId, input.apiId)
                )
              )
              .limit(1);

            if (existingPrices.length > 0) {
              // Update existing price
              await db
                .update(prices)
                .set({
                  smshubPrice,
                  ourPrice,
                  quantityAvailable: quantity as number,
                  lastSync: new Date(),
                })
                .where(eq(prices.id, existingPrices[0].id));
              updated++;
            } else {
              // Insert new price
              await db.insert(prices).values({
                apiId: input.apiId,
                countryId: country.id,
                serviceId: service.id,
                smshubPrice,
                ourPrice,
                quantityAvailable: quantity as number,
                lastSync: new Date(),
                createdAt: new Date(),
              });
              imported++;
            }
          }
        }
      }

      return {
        success: true,
        apiName: apiData.name,
        pricesImported: imported,
        pricesUpdated: updated,
        servicesCreated,
      };
    }),
});
