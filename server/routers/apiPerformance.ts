import { router } from '../_core/trpc';
import { adminProcedure } from '../admin-middleware';
import { getDb } from '../db';
import { activations, prices, smsApis } from '../../drizzle/schema';
import { eq, and, sql, desc } from 'drizzle-orm';
import { z } from 'zod';

export const apiPerformanceRouter = router({
  /**
   * Get comparison data for all APIs
   * Returns: ranking, success rate, total activations, and trend for each API
   */
  getComparison: adminProcedure
    .input(
      z.object({
        startDate: z.string().optional(),
        endDate: z.string().optional(),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error('Database connection failed');

      // Build date filter
      const dateFilter = [];
      if (input.startDate) {
        dateFilter.push(sql`${activations.createdAt} >= ${new Date(input.startDate)}`);
      }
      if (input.endDate) {
        dateFilter.push(sql`${activations.createdAt} <= ${new Date(input.endDate)}`);
      }

      // Get comparison metrics by API
      const comparisonMetrics = await db
        .select({
          apiId: prices.apiId,
          apiName: smsApis.name,
          totalActivations: sql<number>`COUNT(${activations.id})`.as('totalActivations'),
          completedActivations: sql<number>`SUM(CASE WHEN ${activations.status} = 'completed' THEN 1 ELSE 0 END)`.as('completedActivations'),
        })
        .from(activations)
        .innerJoin(prices, and(
          eq(activations.serviceId, prices.serviceId),
          eq(activations.countryId, prices.countryId)
        ))
        .innerJoin(smsApis, eq(prices.apiId, smsApis.id))
        .where(
          dateFilter.length > 0
            ? and(...dateFilter)
            : undefined
        )
        .groupBy(prices.apiId, smsApis.name);

      // Calculate success rate and ranking
      const metricsWithRanking = comparisonMetrics.map((metric: any) => {
        const total = Number(metric.totalActivations) || 0;
        const completed = Number(metric.completedActivations) || 0;
        const successRate = total > 0 ? Math.round((completed / total) * 100) : 0;

        return {
          apiId: metric.apiId,
          apiName: metric.apiName,
          totalActivations: total,
          successRate,
          ranking: 0, // Will be calculated after sorting
          trend: 'stable' as 'up' | 'down' | 'stable', // Default to stable
        };
      });

      // Sort by success rate and assign ranking
      metricsWithRanking.sort((a, b) => b.successRate - a.successRate);
      metricsWithRanking.forEach((metric, index) => {
        metric.ranking = index + 1;
      });

      // Calculate trend (comparing with previous period)
      // For now, we'll use a simple heuristic: if success rate > 80%, trend is up
      // if < 60%, trend is down, otherwise stable
      metricsWithRanking.forEach((metric) => {
        if (metric.successRate > 80) {
          metric.trend = 'up';
        } else if (metric.successRate < 60) {
          metric.trend = 'down';
        } else {
          metric.trend = 'stable';
        }
      });

      return metricsWithRanking;
    }),

  /**
   * Get detailed stats for a specific API
   * Returns: completed, cancelled, pending counts
   */
  getDetailedStats: adminProcedure
    .input(
      z.object({
        apiId: z.number(),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error('Database connection failed');

      // Build date filter
      const dateFilter = [];
      if (input.startDate) {
        dateFilter.push(sql`${activations.createdAt} >= ${new Date(input.startDate)}`);
      }
      if (input.endDate) {
        dateFilter.push(sql`${activations.createdAt} <= ${new Date(input.endDate)}`);
      }

      // Get detailed stats for specific API
      const stats = await db
        .select({
          completed: sql<number>`SUM(CASE WHEN ${activations.status} = 'completed' THEN 1 ELSE 0 END)`.as('completed'),
          cancelled: sql<number>`SUM(CASE WHEN ${activations.status} = 'cancelled' THEN 1 ELSE 0 END)`.as('cancelled'),
          pending: sql<number>`SUM(CASE WHEN ${activations.status} = 'pending' THEN 1 ELSE 0 END)`.as('pending'),
        })
        .from(activations)
        .innerJoin(prices, and(
          eq(activations.serviceId, prices.serviceId),
          eq(activations.countryId, prices.countryId)
        ))
        .where(
          and(
            eq(prices.apiId, input.apiId),
            ...(dateFilter.length > 0 ? dateFilter : [])
          )
        );

      const result = stats[0];
      return {
        completed: Number(result?.completed) || 0,
        cancelled: Number(result?.cancelled) || 0,
        pending: Number(result?.pending) || 0,
      };
    }),
});
