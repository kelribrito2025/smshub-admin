import { sql, and, gte, lte, eq, desc } from 'drizzle-orm';
import { getDb } from './db';
import { activations, countries, services } from '../drizzle/schema';

export interface FinancialMetrics {
  totalRevenue: number;
  totalCost: number;
  totalProfit: number;
  totalActivations: number;
  completedActivations: number;
  cancelledActivations: number;
  averageProfit: number;
  profitMargin: number;
}

export interface RevenueByPeriod {
  date: string;
  revenue: number;
  cost: number;
  profit: number;
  activations: number;
}

export interface RevenueByCountry {
  countryId: number;
  countryName: string;
  countryCode: string;
  revenue: number;
  cost: number;
  profit: number;
  activations: number;
}

export interface RevenueByService {
  serviceId: number;
  serviceName: string;
  serviceCode: string;
  revenue: number;
  cost: number;
  profit: number;
  activations: number;
}

/**
 * Get financial metrics for a date range
 */
export async function getFinancialMetrics(
  startDate?: Date,
  endDate?: Date
): Promise<FinancialMetrics> {
  const db = await getDb();
  if (!db) {
    return {
      totalRevenue: 0,
      totalCost: 0,
      totalProfit: 0,
      totalActivations: 0,
      completedActivations: 0,
      cancelledActivations: 0,
      averageProfit: 0,
      profitMargin: 0,
    };
  }

  const conditions = [];
  if (startDate) {
    conditions.push(gte(activations.createdAt, startDate));
  }
  if (endDate) {
    conditions.push(lte(activations.createdAt, endDate));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const result = await db
    .select({
      totalRevenue: sql<number>`COALESCE(SUM(${activations.sellingPrice}), 0)`,
      totalCost: sql<number>`COALESCE(SUM(${activations.smshubCost}), 0)`,
      totalProfit: sql<number>`COALESCE(SUM(${activations.profit}), 0)`,
      totalActivations: sql<number>`COUNT(*)`,
      completedActivations: sql<number>`SUM(CASE WHEN ${activations.status} = 'completed' THEN 1 ELSE 0 END)`,
      cancelledActivations: sql<number>`SUM(CASE WHEN ${activations.status} = 'cancelled' THEN 1 ELSE 0 END)`,
    })
    .from(activations)
    .where(whereClause);

  const metrics = result[0];

  const totalRevenue = Number(metrics?.totalRevenue || 0);
  const totalCost = Number(metrics?.totalCost || 0);
  const totalProfit = Number(metrics?.totalProfit || 0);
  const totalActivations = Number(metrics?.totalActivations || 0);
  const completedActivations = Number(metrics?.completedActivations || 0);
  const cancelledActivations = Number(metrics?.cancelledActivations || 0);

  const averageProfit = totalActivations > 0 ? totalProfit / totalActivations : 0;
  const profitMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

  return {
    totalRevenue,
    totalCost,
    totalProfit,
    totalActivations,
    completedActivations,
    cancelledActivations,
    averageProfit,
    profitMargin,
  };
}

/**
 * Get revenue grouped by period (day, week, month)
 */
export async function getRevenueByPeriod(
  startDate: Date,
  endDate: Date,
  groupBy: 'day' | 'week' | 'month' = 'day'
): Promise<RevenueByPeriod[]> {
  const db = await getDb();
  if (!db) return [];

  let dateFormat: string;
  switch (groupBy) {
    case 'day':
      dateFormat = '%Y-%m-%d';
      break;
    case 'week':
      dateFormat = '%Y-%u';
      break;
    case 'month':
      dateFormat = '%Y-%m';
      break;
  }

  const result = await db
    .select({
      date: sql<string>`ANY_VALUE(DATE_FORMAT(${activations.createdAt}, ${dateFormat}))`,
      revenue: sql<number>`COALESCE(SUM(${activations.sellingPrice}), 0)`,
      cost: sql<number>`COALESCE(SUM(${activations.smshubCost}), 0)`,
      profit: sql<number>`COALESCE(SUM(${activations.profit}), 0)`,
      activations: sql<number>`COUNT(*)`,
    })
    .from(activations)
    .where(and(gte(activations.createdAt, startDate), lte(activations.createdAt, endDate)))
    .groupBy(sql.raw(`DATE_FORMAT(\`activations\`.\`createdAt\`, '${dateFormat}')`))
    .orderBy(sql.raw(`DATE_FORMAT(\`activations\`.\`createdAt\`, '${dateFormat}')`));

  return result.map((row) => ({
    date: row.date,
    revenue: Number(row.revenue),
    cost: Number(row.cost),
    profit: Number(row.profit),
    activations: Number(row.activations),
  }));
}

/**
 * Get revenue grouped by country
 */
export async function getRevenueByCountry(
  startDate?: Date,
  endDate?: Date
): Promise<RevenueByCountry[]> {
  const db = await getDb();
  if (!db) return [];

  const conditions = [];
  if (startDate) {
    conditions.push(gte(activations.createdAt, startDate));
  }
  if (endDate) {
    conditions.push(lte(activations.createdAt, endDate));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const result = await db
    .select({
      countryId: activations.countryId,
      countryName: countries.name,
      countryCode: countries.code,
      revenue: sql<number>`COALESCE(SUM(${activations.sellingPrice}), 0)`,
      cost: sql<number>`COALESCE(SUM(${activations.smshubCost}), 0)`,
      profit: sql<number>`COALESCE(SUM(${activations.profit}), 0)`,
      activations: sql<number>`COUNT(*)`,
    })
    .from(activations)
    .leftJoin(countries, eq(activations.countryId, countries.id))
    .where(whereClause)
    .groupBy(activations.countryId, countries.name, countries.code)
    .orderBy(desc(sql`SUM(${activations.profit})`));

  return result.map((row) => ({
    countryId: row.countryId,
    countryName: row.countryName || 'Desconhecido',
    countryCode: row.countryCode || '??',
    revenue: Number(row.revenue),
    cost: Number(row.cost),
    profit: Number(row.profit),
    activations: Number(row.activations),
  }));
}

/**
 * Get revenue grouped by service
 */
export async function getRevenueByService(
  startDate?: Date,
  endDate?: Date
): Promise<RevenueByService[]> {
  const db = await getDb();
  if (!db) return [];

  const conditions = [];
  if (startDate) {
    conditions.push(gte(activations.createdAt, startDate));
  }
  if (endDate) {
    conditions.push(lte(activations.createdAt, endDate));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const result = await db
    .select({
      serviceId: activations.serviceId,
      serviceName: services.name,
      serviceCode: services.smshubCode,
      revenue: sql<number>`COALESCE(SUM(${activations.sellingPrice}), 0)`,
      cost: sql<number>`COALESCE(SUM(${activations.smshubCost}), 0)`,
      profit: sql<number>`COALESCE(SUM(${activations.profit}), 0)`,
      activations: sql<number>`COUNT(*)`,
    })
    .from(activations)
    .leftJoin(services, eq(activations.serviceId, services.id))
    .where(whereClause)
    .groupBy(activations.serviceId, services.name, services.smshubCode)
    .orderBy(desc(sql`SUM(${activations.profit})`));

  return result.map((row) => ({
    serviceId: row.serviceId,
    serviceName: row.serviceName || 'Desconhecido',
    serviceCode: row.serviceCode || '??',
    revenue: Number(row.revenue),
    cost: Number(row.cost),
    profit: Number(row.profit),
    activations: Number(row.activations),
  }));
}

/**
 * Get recent activations with details
 */
export async function getRecentActivations(limit: number = 50) {
  const db = await getDb();
  if (!db) return [];

  const result = await db
    .select({
      activation: activations,
      country: countries,
      service: services,
    })
    .from(activations)
    .leftJoin(countries, eq(activations.countryId, countries.id))
    .leftJoin(services, eq(activations.serviceId, services.id))
    .orderBy(desc(activations.createdAt))
    .limit(limit);

  return result;
}

/**
 * Get total refunds (reembolsos) for a date range
 * Only considers refunds made by admin (origin = 'admin' and type = 'refund')
 */
export async function getTotalRefunds(
  startDate?: Date,
  endDate?: Date
): Promise<number> {
  const db = await getDb();
  if (!db) return 0;

  const { balanceTransactions } = await import('../drizzle/schema');
  
  const conditions = [
    eq(balanceTransactions.type, 'refund'),
    eq(balanceTransactions.origin, 'admin'),
  ];
  
  if (startDate) {
    conditions.push(gte(balanceTransactions.createdAt, startDate));
  }
  if (endDate) {
    conditions.push(lte(balanceTransactions.createdAt, endDate));
  }

  const whereClause = and(...conditions);

  const result = await db
    .select({
      totalRefunds: sql<number>`COALESCE(SUM(ABS(${balanceTransactions.amount})), 0)`,
    })
    .from(balanceTransactions)
    .where(whereClause);

  return Number(result[0]?.totalRefunds || 0);
}
