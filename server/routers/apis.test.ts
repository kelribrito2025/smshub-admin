import { describe, it, expect, beforeEach } from 'vitest';
import { appRouter } from '../routers';
import { createContext } from '../_core/context';
import { getDb } from '../db';
import { smsApis } from '../../drizzle/schema';
import { eq } from 'drizzle-orm';

describe('APIs Router - Currency and Pricing', () => {
  let adminContext: any;

  beforeEach(async () => {
    // Create admin context
    adminContext = await createContext({
      req: {} as any,
      res: {} as any,
    });
    adminContext.user = {
      id: 1,
      openId: 'test-admin',
      name: 'Admin Test',
      email: 'admin@test.com',
      role: 'admin',
    };
  });

  it('should create API with BRL currency', async () => {
    const caller = appRouter.createCaller(adminContext);

    const api = await caller.apis.create({
      name: 'Test API BRL',
      url: 'https://api.test.com',
      token: 'test-token-brl',
      priority: 99,
      active: true,
      currency: 'BRL',
      profitPercentage: 150,
      minimumPrice: 300, // R$ 3,00 in cents
    });

    expect(api).toBeDefined();
    expect(api.currency).toBe('BRL');
    expect(api.minimumPrice).toBe(300);
    expect(api.profitPercentage).toBe('150.00');

    // Cleanup
    const db = await getDb();
    await db?.delete(smsApis).where(eq(smsApis.id, api.id));
  });

  it('should create API with USD currency (default)', async () => {
    const caller = appRouter.createCaller(adminContext);

    const api = await caller.apis.create({
      name: 'Test API USD',
      url: 'https://api.test.com',
      token: 'test-token-usd',
      priority: 98,
      active: true,
      currency: 'USD',
      profitPercentage: 200,
      minimumPrice: 500, // R$ 5,00 in cents
    });

    expect(api).toBeDefined();
    expect(api.currency).toBe('USD');
    expect(api.minimumPrice).toBe(500);

    // Cleanup
    const db = await getDb();
    await db?.delete(smsApis).where(eq(smsApis.id, api.id));
  });

  it('should update API currency from USD to BRL', async () => {
    const caller = appRouter.createCaller(adminContext);

    // Create with USD
    const api = await caller.apis.create({
      name: 'Test API Update Currency',
      url: 'https://api.test.com',
      token: 'test-token-update',
      priority: 97,
      active: true,
      currency: 'USD',
      profitPercentage: 100,
      minimumPrice: 200,
    });

    expect(api.currency).toBe('USD');

    // Update to BRL
    const updated = await caller.apis.update({
      id: api.id,
      currency: 'BRL',
    });

    expect(updated.currency).toBe('BRL');
    expect(updated.minimumPrice).toBe(200); // Should remain unchanged

    // Cleanup
    const db = await getDb();
    await db?.delete(smsApis).where(eq(smsApis.id, api.id));
  });

  it('should store minimumPrice in cents correctly', async () => {
    const caller = appRouter.createCaller(adminContext);

    // Test various price values
    const testCases = [
      { input: 0, expected: 0 },       // R$ 0,00
      { input: 100, expected: 100 },   // R$ 1,00
      { input: 250, expected: 250 },   // R$ 2,50
      { input: 1000, expected: 1000 }, // R$ 10,00
      { input: 12345, expected: 12345 }, // R$ 123,45
    ];

    for (const testCase of testCases) {
      const api = await caller.apis.create({
        name: `Test Price ${testCase.input}`,
        url: 'https://api.test.com',
        token: `test-token-${testCase.input}`,
        priority: 90 + testCases.indexOf(testCase),
        active: true,
        currency: 'BRL',
        profitPercentage: 150,
        minimumPrice: testCase.input,
      });

      expect(api.minimumPrice).toBe(testCase.expected);

      // Cleanup
      const db = await getDb();
      await db?.delete(smsApis).where(eq(smsApis.id, api.id));
    }
  });

  it('should validate profitPercentage range', async () => {
    const caller = appRouter.createCaller(adminContext);

    // Valid: 0%
    const api1 = await caller.apis.create({
      name: 'Test 0% Profit',
      url: 'https://api.test.com',
      token: 'test-token-0',
      priority: 80,
      active: true,
      currency: 'BRL',
      profitPercentage: 0,
      minimumPrice: 100,
    });
    expect(api1.profitPercentage).toBe('0.00');

    // Valid: 999.99% (max for decimal(5,2))
    const api2 = await caller.apis.create({
      name: 'Test 999% Profit',
      url: 'https://api.test.com',
      token: 'test-token-999',
      priority: 81,
      active: true,
      currency: 'BRL',
      profitPercentage: 999.99,
      minimumPrice: 100,
    });
    expect(api2.profitPercentage).toBe('999.99');

    // Cleanup
    const db = await getDb();
    await db?.delete(smsApis).where(eq(smsApis.id, api1.id));
    await db?.delete(smsApis).where(eq(smsApis.id, api2.id));
  });

  it('should list all APIs with currency field', async () => {
    const caller = appRouter.createCaller(adminContext);

    // Create test APIs
    const api1 = await caller.apis.create({
      name: 'Test List BRL',
      url: 'https://api1.test.com',
      token: 'test-token-list-1',
      priority: 70,
      active: true,
      currency: 'BRL',
      profitPercentage: 150,
      minimumPrice: 300,
    });

    const api2 = await caller.apis.create({
      name: 'Test List USD',
      url: 'https://api2.test.com',
      token: 'test-token-list-2',
      priority: 71,
      active: true,
      currency: 'USD',
      profitPercentage: 200,
      minimumPrice: 500,
    });

    const apis = await caller.apis.list();

    expect(apis).toBeDefined();
    expect(Array.isArray(apis)).toBe(true);
    
    const createdApis = apis.filter(a => a.id === api1.id || a.id === api2.id);
    expect(createdApis.length).toBe(2);
    
    const brlApi = createdApis.find(a => a.id === api1.id);
    const usdApi = createdApis.find(a => a.id === api2.id);
    
    expect(brlApi?.currency).toBe('BRL');
    expect(usdApi?.currency).toBe('USD');

    // Cleanup
    const db = await getDb();
    await db?.delete(smsApis).where(eq(smsApis.id, api1.id));
    await db?.delete(smsApis).where(eq(smsApis.id, api2.id));
  });
});
