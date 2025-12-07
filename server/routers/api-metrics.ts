import { router } from '../_core/trpc';
import { adminProcedure } from '../admin-middleware';
import { getDb } from '../db';
import { activations, prices, smsApis, services, countries } from '../../drizzle/schema';
import { eq, and, sql, desc } from 'drizzle-orm';
import { z } from 'zod';

export const apiMetricsRouter = router({
  /**
   * Get performance metrics for all APIs
   * Returns: sales count, revenue, profit, and availability for each API
   */
  getPerformanceMetrics: adminProcedure
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

      // Get sales metrics by API
      // Note: activations don't have priceId, so we join via serviceId and countryId
      const salesMetrics = await db
        .select({
          apiId: prices.apiId,
          apiName: smsApis.name,
          totalSales: sql<number>`COUNT(${activations.id})`.as('totalSales'),
          totalRevenue: sql<number>`SUM(${activations.sellingPrice})`.as('totalRevenue'),
          totalCost: sql<number>`SUM(${activations.smshubCost})`.as('totalCost'),
          totalProfit: sql<number>`SUM(${activations.profit})`.as('totalProfit'),
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

      // Get availability metrics by API
      const availabilityMetrics = await db
        .select({
          apiId: prices.apiId,
          apiName: smsApis.name,
          totalServices: sql<number>`COUNT(DISTINCT ${prices.serviceId})`.as('totalServices'),
          totalAvailable: sql<number>`SUM(${prices.quantityAvailable})`.as('totalAvailable'),
          activeServices: sql<number>`COUNT(DISTINCT ${prices.serviceId})`.as('activeServices'),
        })
        .from(prices)
        .innerJoin(smsApis, eq(prices.apiId, smsApis.id))
        .where(eq(smsApis.active, true))
        .groupBy(prices.apiId, smsApis.name);

      // Merge metrics
      const metricsMap = new Map();

      salesMetrics.forEach((metric: any) => {
        if (metric.apiId) {
          metricsMap.set(metric.apiId, {
            apiId: metric.apiId,
            apiName: metric.apiName,
            totalSales: Number(metric.totalSales) || 0,
            totalRevenue: Number(metric.totalRevenue) || 0,
            totalCost: Number(metric.totalCost) || 0,
            totalProfit: Number(metric.totalProfit) || 0,
            totalServices: 0,
            totalAvailable: 0,
            activeServices: 0,
          });
        }
      });

      availabilityMetrics.forEach((metric: any) => {
        if (metric.apiId) {
          const existing = metricsMap.get(metric.apiId) || {
            apiId: metric.apiId,
            apiName: metric.apiName,
            totalSales: 0,
            totalRevenue: 0,
            totalCost: 0,
            totalProfit: 0,
          };

          metricsMap.set(metric.apiId, {
            ...existing,
            totalServices: Number(metric.totalServices) || 0,
            totalAvailable: Number(metric.totalAvailable) || 0,
            activeServices: Number(metric.activeServices) || 0,
          });
        }
      });

      // Calculate profit margin for each API
      const metricsWithMargin = Array.from(metricsMap.values()).map((metric: any) => ({
        ...metric,
        profitMargin: metric.totalRevenue > 0 
          ? (metric.totalProfit / metric.totalRevenue) * 100 
          : 0,
      }));

      return metricsWithMargin.sort((a: any, b: any) => b.totalSales - a.totalSales);
    }),

  /**
   * Get top services by API
   */
  getTopServicesByApi: adminProcedure
    .input(
      z.object({
        apiId: z.number(),
        limit: z.number().default(10),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error('Database connection failed');

      const topServices = await db
        .select({
          serviceId: services.id,
          serviceName: services.name,
          serviceCode: services.smshubCode,
          totalSales: sql<number>`COUNT(${activations.id})`.as('totalSales'),
          totalRevenue: sql<number>`SUM(${activations.sellingPrice})`.as('totalRevenue'),
          totalProfit: sql<number>`SUM(${activations.profit})`.as('totalProfit'),
        })
        .from(activations)
        .innerJoin(prices, and(
          eq(activations.serviceId, prices.serviceId),
          eq(activations.countryId, prices.countryId)
        ))
        .innerJoin(services, eq(prices.serviceId, services.id))
        .where(eq(prices.apiId, input.apiId))
        .groupBy(services.id, services.name, services.smshubCode)
        .orderBy(desc(sql`COUNT(${activations.id})`))
        .limit(input.limit);

      return topServices.map((service: any) => ({
        ...service,
        totalSales: Number(service.totalSales) || 0,
        totalRevenue: Number(service.totalRevenue) || 0,
        totalProfit: Number(service.totalProfit) || 0,
      }));
    }),
});
