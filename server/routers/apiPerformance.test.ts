import { describe, it, expect, beforeAll } from 'vitest';
import { appRouter } from '../routers';
import { createContext } from '../_core/context';
import { getDb } from '../db';

describe('apiPerformance Router', () => {
  let caller: ReturnType<typeof appRouter.createCaller>;

  beforeAll(async () => {
    // Create mock admin context
    const mockReq = {} as any;
    const mockRes = {} as any;
    const mockUser = {
      id: 1,
      openId: 'test-admin',
      name: 'Test Admin',
      email: 'admin@test.com',
      role: 'admin' as const,
      loginMethod: 'password' as const,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    };

    const ctx = await createContext({ req: mockReq, res: mockRes });
    ctx.user = mockUser;
    caller = appRouter.createCaller(ctx);
  });

  it('should get comparison data for all APIs', async () => {
    const result = await caller.apiPerformance.getComparison({
      startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      endDate: new Date().toISOString(),
    });

    expect(Array.isArray(result)).toBe(true);
    
    // If there are results, validate structure
    if (result.length > 0) {
      const firstApi = result[0];
      expect(firstApi).toHaveProperty('apiId');
      expect(firstApi).toHaveProperty('apiName');
      expect(firstApi).toHaveProperty('totalActivations');
      expect(firstApi).toHaveProperty('successRate');
      expect(firstApi).toHaveProperty('ranking');
      expect(firstApi).toHaveProperty('trend');
      expect(['up', 'down', 'stable']).toContain(firstApi.trend);
    }
  });

  it('should get detailed stats for a specific API', async () => {
    const result = await caller.apiPerformance.getDetailedStats({
      apiId: 1,
      startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      endDate: new Date().toISOString(),
    });

    expect(result).toHaveProperty('completed');
    expect(result).toHaveProperty('cancelled');
    expect(result).toHaveProperty('pending');
    expect(typeof result.completed).toBe('number');
    expect(typeof result.cancelled).toBe('number');
    expect(typeof result.pending).toBe('number');
  });

  it('should handle empty date range gracefully', async () => {
    const result = await caller.apiPerformance.getComparison({});
    
    expect(Array.isArray(result)).toBe(true);
  });

  it('should return zero counts for non-existent API', async () => {
    const result = await caller.apiPerformance.getDetailedStats({
      apiId: 99999, // Non-existent API
      startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      endDate: new Date().toISOString(),
    });

    expect(result.completed).toBe(0);
    expect(result.cancelled).toBe(0);
    expect(result.pending).toBe(0);
  });
});
