import { describe, it, expect, beforeAll } from 'vitest';
import { appRouter } from '../routers';
import { createContext } from '../_core/context';
import { getDb } from '../db';
import { smsApis } from '../../drizzle/schema';
import { eq } from 'drizzle-orm';

describe('API Metrics Router', () => {
  let caller: any;
  let testApiIds: number[] = [];

  beforeAll(async () => {
    const db = await getDb();
    if (!db) throw new Error('Database connection failed');

    // Create test context with mock user
    const ctx = await createContext({
      req: {} as any,
      res: {} as any,
    });
    
    // Add mock user for protected procedures
    (ctx as any).user = {
      openId: 'test-user',
      name: 'Test User',
      email: 'test@example.com',
      role: 'admin',
    };

    caller = appRouter.createCaller(ctx);

    // Get existing APIs from database
    const apis = await db.select().from(smsApis).where(eq(smsApis.active, true)).limit(2);
    testApiIds = apis.map(api => api.id);
  });

  it('should get performance metrics for all APIs', async () => {
    const result = await caller.apiMetrics.getPerformanceMetrics({});

    expect(result).toBeDefined();
    expect(Array.isArray(result)).toBe(true);

    // If there are results, check structure
    if (result.length > 0) {
      const metric = result[0];
      expect(metric).toHaveProperty('apiId');
      expect(metric).toHaveProperty('apiName');
      expect(metric).toHaveProperty('totalSales');
      expect(metric).toHaveProperty('totalRevenue');
      expect(metric).toHaveProperty('totalProfit');
      expect(metric).toHaveProperty('profitMargin');
      expect(metric).toHaveProperty('totalAvailable');
    }
  });

  it('should filter metrics by date range', async () => {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 7);
    const endDate = new Date();

    const result = await caller.apiMetrics.getPerformanceMetrics({
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
    });

    expect(result).toBeDefined();
    expect(Array.isArray(result)).toBe(true);
  });

  it('should get top services by API', async () => {
    if (testApiIds.length === 0) {
      console.log('No APIs found, skipping test');
      return;
    }

    const result = await caller.apiMetrics.getTopServicesByApi({
      apiId: testApiIds[0],
      limit: 5,
    });

    expect(result).toBeDefined();
    expect(Array.isArray(result)).toBe(true);

    if (result.length > 0) {
      const service = result[0];
      expect(service).toHaveProperty('serviceId');
      expect(service).toHaveProperty('serviceName');
      expect(service).toHaveProperty('totalSales');
      expect(service).toHaveProperty('totalRevenue');
      expect(service).toHaveProperty('totalProfit');
    }
  });

  it('should return empty array for non-existent API', async () => {
    const result = await caller.apiMetrics.getTopServicesByApi({
      apiId: 999999, // Non-existent API
      limit: 5,
    });

    expect(result).toBeDefined();
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBe(0);
  });

  it('should calculate profit margin correctly', async () => {
    const result = await caller.apiMetrics.getPerformanceMetrics({});

    if (result.length > 0) {
      const apiMetric = result[0];
      
      // Profit margin should be between 0 and 100
      expect(apiMetric.profitMargin).toBeGreaterThanOrEqual(0);
      expect(apiMetric.profitMargin).toBeLessThanOrEqual(100);

      // If there's revenue, check calculation
      if (apiMetric.totalRevenue > 0) {
        const expectedMargin = (apiMetric.totalProfit / apiMetric.totalRevenue) * 100;
        expect(apiMetric.profitMargin).toBeCloseTo(expectedMargin, 1);
      }
    }
  });

  it('should include availability metrics', async () => {
    const result = await caller.apiMetrics.getPerformanceMetrics({});

    if (result.length > 0) {
      const apiMetric = result[0];
      expect(apiMetric).toHaveProperty('totalAvailable');
      expect(apiMetric.totalAvailable).toBeGreaterThanOrEqual(0);
    }
  });

  it('should respect limit parameter in top services', async () => {
    if (testApiIds.length === 0) {
      console.log('No APIs found, skipping test');
      return;
    }

    const limit = 3;
    const result = await caller.apiMetrics.getTopServicesByApi({
      apiId: testApiIds[0],
      limit,
    });

    expect(result.length).toBeLessThanOrEqual(limit);
  });

  it('should return metrics for specific date range', async () => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const result = await caller.apiMetrics.getPerformanceMetrics({
      startDate: yesterday.toISOString().split('T')[0],
      endDate: today.toISOString().split('T')[0],
    });

    expect(result).toBeDefined();
    expect(Array.isArray(result)).toBe(true);
  });
});
