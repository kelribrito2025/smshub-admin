import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { getDb } from './db';
import { smsApis, countries } from '../drizzle/schema';
import { appRouter } from './routers';
import type { TrpcContext } from './_core/context';

describe('Prices Import - API Active Validation', () => {
  let db: Awaited<ReturnType<typeof getDb>>;
  let testApiId: number;
  let testCountryId: number;

  beforeAll(async () => {
    db = await getDb();
    if (!db) throw new Error('Database not available');

    // Create test API (inactive)
    const [api] = await db.insert(smsApis).values({
      name: 'Test Inactive API',
      url: 'https://test-api.example.com',
      token: 'test-token-123',
      active: false, // Inactive API
      priority: 999,
      currency: 'BRL',
      exchangeRate: '1.00',
      profitPercentage: '150.00',
      minimumPrice: 300,
    });
    testApiId = Number(api.insertId);

    // Create test country
    const [country] = await db.insert(countries).values({
      smshubId: 999,
      name: 'Test Country',
      code: 'TEST',
      active: true,
    });
    testCountryId = Number(country.insertId);
  });

  afterAll(async () => {
    if (!db) return;
    
    // Cleanup test data
    await db.delete(smsApis).where({ id: testApiId } as any);
    await db.delete(countries).where({ id: testCountryId } as any);
  });

  it('should reject import when API is inactive', async () => {
    const ctx: TrpcContext = {
      user: {
        id: 1,
        openId: 'test-admin',
        name: 'Test Admin',
        email: 'admin@test.com',
        role: 'admin',
        loginMethod: 'email',
        createdAt: new Date(),
        updatedAt: new Date(),
        lastSignedIn: new Date(),
      },
      req: { protocol: 'https', headers: {} } as any,
      res: {} as any,
    };
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.prices.importCountryServices({
        apiId: testApiId,
        countryId: testCountryId,
        priceMultiplier: 2,
      })
    ).rejects.toThrow(/Esta API está inativa/);
  });

  it('should allow import when API is active', async () => {
    if (!db) throw new Error('Database not available');

    // Activate the API
    await db.update(smsApis).set({ active: true }).where({ id: testApiId } as any);

    const ctx: TrpcContext = {
      user: {
        id: 1,
        openId: 'test-admin',
        name: 'Test Admin',
        email: 'admin@test.com',
        role: 'admin',
        loginMethod: 'email',
        createdAt: new Date(),
        updatedAt: new Date(),
        lastSignedIn: new Date(),
      },
      req: { protocol: 'https', headers: {} } as any,
      res: {} as any,
    };
    const caller = appRouter.createCaller(ctx);

    // This should not throw an error about inactive API
    // (It may fail for other reasons like invalid API token, but not because API is inactive)
    try {
      await caller.prices.importCountryServices({
        apiId: testApiId,
        countryId: testCountryId,
        priceMultiplier: 2,
      });
    } catch (error: any) {
      // Should not be the "inactive API" error
      expect(error.message).not.toMatch(/Esta API está inativa/);
    }

    // Deactivate again for cleanup
    await db.update(smsApis).set({ active: false }).where({ id: testApiId } as any);
  });

  it('should reject import with clear error message', async () => {
    const ctx: TrpcContext = {
      user: {
        id: 1,
        openId: 'test-admin',
        name: 'Test Admin',
        email: 'admin@test.com',
        role: 'admin',
        loginMethod: 'email',
        createdAt: new Date(),
        updatedAt: new Date(),
        lastSignedIn: new Date(),
      },
      req: { protocol: 'https', headers: {} } as any,
      res: {} as any,
    };
    const caller = appRouter.createCaller(ctx);

    try {
      await caller.prices.importCountryServices({
        apiId: testApiId,
        countryId: testCountryId,
        priceMultiplier: 2,
      });
      // Should not reach here
      expect(true).toBe(false);
    } catch (error: any) {
      expect(error.message).toContain('Esta API está inativa');
      expect(error.message).toContain('Test Inactive API');
      expect(error.message).toContain('não pode receber novos serviços');
    }
  });
});
