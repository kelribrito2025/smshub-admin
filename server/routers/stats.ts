import { z } from 'zod';
import { router } from '../_core/trpc';
import { adminProcedure } from '../admin-middleware';
import {
  getActivationStats,
  getTopServices,
  getTopCountries,
  getAllActivations,
  getAllPrices,
} from '../db-helpers';
import {
  getApiPerformanceStats,
  compareApiPerformance,
  getServiceApiPerformance,
} from '../api-performance-helpers';

export const statsRouter = router({
  /**
   * Get dashboard statistics
   */
  getDashboard: adminProcedure
    .input(
      z
        .object({
          startDate: z.date().optional(),
          endDate: z.date().optional(),
        })
        .optional()
    )
    .query(async ({ input }) => {
      const stats = await getActivationStats(input?.startDate, input?.endDate);
      const topServices = await getTopServices(5);
      const topCountries = await getTopCountries(5);
      const recentActivations = await getAllActivations(10);

      return {
        stats,
        topServices,
        topCountries,
        recentActivations,
      };
    }),

  /**
   * Get activation statistics
   */
  getActivationStats: adminProcedure
    .input(
      z
        .object({
          startDate: z.date().optional(),
          endDate: z.date().optional(),
        })
        .optional()
    )
    .query(async ({ input }) => {
      return getActivationStats(input?.startDate, input?.endDate);
    }),

  /**
   * Get top services by sales
   */
  getTopServices: adminProcedure
    .input(z.object({ limit: z.number().optional() }).optional())
    .query(async ({ input }) => {
      return getTopServices(input?.limit || 10);
    }),

  /**
   * Get top countries by sales
   */
  getTopCountries: adminProcedure
    .input(z.object({ limit: z.number().optional() }).optional())
    .query(async ({ input }) => {
      return getTopCountries(input?.limit || 10);
    }),

  /**
   * Get recent activations
   */
  getRecentActivations: adminProcedure
    .input(z.object({ limit: z.number().optional() }).optional())
    .query(async ({ input }) => {
      return getAllActivations(input?.limit || 50);
    }),

  /**
   * Get price overview
   */
  getPriceOverview: adminProcedure.query(async () => {
    const allPrices = await getAllPrices();

    const totalServices = new Set(allPrices.map(p => p.price?.serviceId)).size;
    const totalCountries = new Set(allPrices.map(p => p.price?.countryId)).size;
    const totalAvailable = allPrices.reduce((sum, p) => sum + (p.price?.quantityAvailable || 0), 0);

    return {
      totalServices,
      totalCountries,
      totalPriceCombinations: allPrices.length,
      totalAvailable,
    };
  }),

  /**
   * Get API performance statistics
   */
  getApiPerformance: adminProcedure
    .input(
      z.object({
        apiId: z.number(),
        days: z.number().optional().default(30),
      })
    )
    .query(async ({ input }) => {
      return await getApiPerformanceStats(input.apiId, input.days);
    }),

  /**
   * Compare all APIs performance
   */
  compareApis: adminProcedure
    .input(
      z.object({
        days: z.number().optional().default(30),
      })
    )
    .query(async ({ input }) => {
      return await compareApiPerformance(input.days);
    }),

  /**
   * Get service-specific API performance
   */
  getServiceApiPerformance: adminProcedure
    .input(
      z.object({
        serviceId: z.number(),
        days: z.number().optional().default(30),
      })
    )
    .query(async ({ input }) => {
      return await getServiceApiPerformance(input.serviceId, input.days);
    }),
});
