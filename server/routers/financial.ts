import { z } from 'zod';
import { router } from '../_core/trpc';
import { adminProcedure } from '../admin-middleware';
import {
  getFinancialMetrics,
  getRevenueByPeriod,
  getRevenueByCountry,
  getRevenueByService,
  getRecentActivations,
  getTotalRefunds,
} from '../financial-helpers';

export const financialRouter = router({
  /**
   * Get overall financial metrics
   */
  getMetrics: adminProcedure
    .input(
      z
        .object({
          startDate: z.date().optional(),
          endDate: z.date().optional(),
        })
        .optional()
    )
    .query(async ({ input }) => {
      return getFinancialMetrics(input?.startDate, input?.endDate);
    }),

  /**
   * Get revenue by period (daily, weekly, monthly)
   */
  getRevenueByPeriod: adminProcedure
    .input(
      z.object({
        startDate: z.date(),
        endDate: z.date(),
        groupBy: z.enum(['day', 'week', 'month']).default('day'),
      })
    )
    .query(async ({ input }) => {
      return getRevenueByPeriod(input.startDate, input.endDate, input.groupBy);
    }),

  /**
   * Get revenue by country
   */
  getRevenueByCountry: adminProcedure
    .input(
      z
        .object({
          startDate: z.date().optional(),
          endDate: z.date().optional(),
        })
        .optional()
    )
    .query(async ({ input }) => {
      return getRevenueByCountry(input?.startDate, input?.endDate);
    }),

  /**
   * Get revenue by service
   */
  getRevenueByService: adminProcedure
    .input(
      z
        .object({
          startDate: z.date().optional(),
          endDate: z.date().optional(),
        })
        .optional()
    )
    .query(async ({ input }) => {
      return getRevenueByService(input?.startDate, input?.endDate);
    }),

  /**
   * Get recent activations with full details
   */
  getRecentActivations: adminProcedure
    .input(
      z
        .object({
          limit: z.number().min(1).max(100).default(50),
        })
        .optional()
    )
    .query(async ({ input }) => {
      return getRecentActivations(input?.limit || 50);
    }),

  /**
   * Get total refunds (reembolsos) made by admin
   */
  getTotalRefunds: adminProcedure
    .input(
      z
        .object({
          startDate: z.date().optional(),
          endDate: z.date().optional(),
        })
        .optional()
    )
    .query(async ({ input }) => {
      return getTotalRefunds(input?.startDate, input?.endDate);
    }),
});
