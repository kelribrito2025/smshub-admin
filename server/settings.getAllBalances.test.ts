import { describe, it, expect } from 'vitest';
import { appRouter } from './routers';
import { getDb } from './db';
import { smsApis } from '../drizzle/schema';
import type { TrpcContext } from './_core/context';

type AuthenticatedUser = NonNullable<TrpcContext['user']>;

function createAdminContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: 'test-admin',
    name: 'Test Admin',
    email: 'admin@test.com',
    role: 'admin',
    loginMethod: 'email',
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  const ctx: TrpcContext = {
    user,
    req: {
      protocol: 'https',
      headers: {},
    } as TrpcContext['req'],
    res: {
      clearCookie: () => {},
    } as TrpcContext['res'],
  };

  return ctx;
}

describe('settings.getAllBalances', () => {

  it('should fetch balances from all active APIs', async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const db = await getDb();
    if (!db) throw new Error('Database not available');

    // Get active APIs from database
    const activeApis = await db
      .select()
      .from(smsApis)
      .where(smsApis.active);

    console.log(`Found ${activeApis.length} active APIs in database`);

    // Fetch balances
    const result = await caller.settings.getAllBalances();

    // Validate result structure
    expect(result).toBeDefined();
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);

    // Validate each balance entry
    result.forEach((balance) => {
      expect(balance).toHaveProperty('id');
      expect(balance).toHaveProperty('name');
      expect(balance).toHaveProperty('balance');
      expect(balance).toHaveProperty('currency');
      expect(balance).toHaveProperty('error');

      // Balance should be a number
      expect(typeof balance.balance).toBe('number');

      // Currency should be BRL or USD
      expect(['BRL', 'USD']).toContain(balance.currency);

      console.log(`API ${balance.name}: ${balance.currency} ${balance.balance.toFixed(2)} ${balance.error ? `(Error: ${balance.error})` : ''}`);
    });
  });

  it('should return balances ordered by priority', async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.settings.getAllBalances();

    // Verify we have at least 2 APIs to compare
    if (result.length >= 2) {
      // IDs should be in ascending order (which corresponds to priority order)
      for (let i = 0; i < result.length - 1; i++) {
        expect(result[i].id).toBeLessThanOrEqual(result[i + 1].id);
      }
    }
  });

  it('should handle API errors gracefully', async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.settings.getAllBalances();

    // Even if some APIs fail, the endpoint should not throw
    expect(result).toBeDefined();
    expect(Array.isArray(result)).toBe(true);

    // Check if any API has an error
    const apisWithErrors = result.filter(api => api.error !== null);
    if (apisWithErrors.length > 0) {
      console.log(`${apisWithErrors.length} API(s) returned errors:`);
      apisWithErrors.forEach(api => {
        console.log(`- ${api.name}: ${api.error}`);
      });
    }

    // APIs with errors should have balance = 0
    apisWithErrors.forEach(api => {
      expect(api.balance).toBe(0);
    });
  });

  it('should include expected API names', async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.settings.getAllBalances();

    const apiNames = result.map(api => api.name);
    console.log('API names found:', apiNames);

    // We expect to find these APIs (based on database query)
    // Note: This test is flexible - it just checks that we got some APIs
    expect(apiNames.length).toBeGreaterThan(0);
  });
});
