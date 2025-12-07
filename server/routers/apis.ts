import { z } from 'zod';
import { adminProcedure, router } from '../_core/trpc';
import {
  getAllApis,
  getActiveApis,
  getApiById,
  createApi,
  updateApi,
  deleteApi,
  toggleApiActive,
} from '../apis-helpers';
import { getDb } from '../db';
import { prices } from '../../drizzle/schema';
import { eq } from 'drizzle-orm';
import { SMSHubClient } from '../smshub-client';
import { getSetting } from '../db-helpers';

export const apisRouter = router({
  // List all APIs
  list: adminProcedure.query(async () => {
    return await getAllApis();
  }),

  // List only active APIs
  listActive: adminProcedure.query(async () => {
    return await getActiveApis();
  }),

  // Get single API by ID
  getById: adminProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const api = await getApiById(input.id);
      if (!api) throw new Error('API not found');
      return api;
    }),

  // Create new API
  create: adminProcedure
    .input(z.object({
      name: z.string().min(1),
      url: z.string().url(),
      token: z.string().min(1),
      priority: z.number().default(0),
      active: z.boolean().default(true),
      currency: z.enum(["BRL", "USD"]).default("USD"),
      profitPercentage: z.number().min(0).max(999.99).default(0), // 0% to 999.99%
      minimumPrice: z.number().min(0).default(0), // in cents
      maxSimultaneousOrders: z.number().min(0).max(100).default(0), // 0 = unlimited
    }))
    .mutation(async ({ input }) => {
      const { profitPercentage, ...rest } = input;
      const data: any = { ...rest };
      
      // Convert profitPercentage to string
      data.profitPercentage = profitPercentage.toFixed(2);
      
      return await createApi(data);
    }),

  // Update existing API
  update: adminProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().min(1).optional(),
      url: z.string().url().optional(),
      token: z.string().min(1).optional(),
      priority: z.number().optional(),
      active: z.boolean().optional(),
      currency: z.enum(["BRL", "USD"]).optional(),
      profitPercentage: z.number().min(0).max(999.99).optional(), // 0% to 999.99%
      minimumPrice: z.number().min(0).optional(), // in cents
      maxSimultaneousOrders: z.number().min(0).max(100).optional(), // 0 = unlimited
    }))
    .mutation(async ({ input }) => {
      const { id, profitPercentage, ...rest } = input;
      const data: any = { ...rest };
      
      // Convert profitPercentage to string if provided
      if (profitPercentage !== undefined) {
        data.profitPercentage = profitPercentage.toFixed(2);
      }
      
      // Update API first
      const updatedApi = await updateApi(id, data);
      
      // If profitPercentage or minimumPrice changed, resync all prices for this API
      const shouldResync = profitPercentage !== undefined || input.minimumPrice !== undefined;
      
      if (shouldResync) {
        console.log(`[API Update] Profit/price settings changed for API ${id}, triggering automatic resync...`);
        
        try {
          const db = await getDb();
          if (!db) throw new Error('Database connection failed');
          
          // Get updated API data
          const api = await getApiById(id);
          if (!api) throw new Error('API not found after update');
          
          let updatedPrices = 0;
          
          // Get all existing price records for this API
          const existingPrices = await db.select().from(prices).where(eq(prices.apiId, id));
          
          console.log(`[API Update] Found ${existingPrices.length} existing prices to recalculate`);
          
          // Recalculate each price using existing smshubPrice and new profit settings
          for (const priceRecord of existingPrices) {
            // Skip if no cost saved
            if (!priceRecord.smshubPrice || priceRecord.smshubPrice === 0) {
              console.log(`[API Update] Skipping price ID ${priceRecord.id} - no smshubPrice`);
              continue;
            }
            
            // Calculate new price using updated profit settings
            const profitRate = parseFloat(api.profitPercentage || '0') / 100;
            const calculatedPrice = Math.round(priceRecord.smshubPrice * (1 + profitRate));
            const finalPrice = Math.max(calculatedPrice, api.minimumPrice || 0);
            
            console.log(`[API Update] Recalculating price ID ${priceRecord.id}: smshubPrice=${priceRecord.smshubPrice}, profit=${api.profitPercentage}%, calculated=${calculatedPrice}, final=${finalPrice}`);
            
            // Update price in database
            await db.update(prices)
              .set({ 
                ourPrice: finalPrice,
              })
              .where(eq(prices.id, priceRecord.id));
            
            updatedPrices++;
          }
          
          console.log(`[API Update] Successfully recalculated ${updatedPrices} prices for API ${id}`);
        } catch (error) {
          console.error(`[API Update] Error during automatic resync:`, error);
          // Don't throw - API update was successful, resync is bonus
        }
      }
      
      return updatedApi;
    }),

  // Delete API
  delete: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      return await deleteApi(input.id);
    }),

  // Toggle API active status
  toggleActive: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      return await toggleApiActive(input.id);
    }),
});
