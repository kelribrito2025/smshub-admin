import { describe, it, expect, beforeAll } from 'vitest';
import { appRouter } from '../routers';
import { getDb } from '../db';
import { prices, countries, services, apis } from '../../drizzle/schema';

describe('Prices Router - Country Filter Bug Fix', () => {
  let caller: any;

  beforeAll(async () => {
    // Create admin caller
    caller = appRouter.createCaller({
      user: {
        openId: 'test-admin',
        name: 'Test Admin',
        email: 'admin@test.com',
        role: 'admin',
      },
    });
  });

  it('should accept pageSize up to 1000000 (bug fix)', async () => {
    // Test that the backend now accepts large pageSize values
    const result = await caller.prices.getAll({
      page: 1,
      pageSize: 999999, // This would fail before the fix (max was 100)
      filterCountry: 'br',
    });

    // Should not throw error
    expect(result).toBeDefined();
    expect(result.items).toBeDefined();
    expect(Array.isArray(result.items)).toBe(true);
    
    console.log(`Query with pageSize=999999 succeeded. Total items: ${result.total}`);
  });

  it('should apply country filter correctly', async () => {
    // Get all prices without filter
    const allResult = await caller.prices.getAll({
      page: 1,
      pageSize: 999999,
    });

    // Get prices filtered by a specific country
    const filteredResult = await caller.prices.getAll({
      page: 1,
      pageSize: 999999,
      filterCountry: 'us',
    });

    console.log(`Total items (no filter): ${allResult.total}`);
    console.log(`Total items (US only): ${filteredResult.total}`);

    // Filtered result should be <= total
    expect(filteredResult.total).toBeLessThanOrEqual(allResult.total);

    // All items should be from US
    filteredResult.items.forEach((item: any) => {
      expect(item.country?.code).toBe('us');
    });
  });

  it('should apply status filter correctly', async () => {
    // Get all prices
    const allResult = await caller.prices.getAll({
      page: 1,
      pageSize: 999999,
    });

    // Get only active prices
    const activeResult = await caller.prices.getAll({
      page: 1,
      pageSize: 999999,
      filterStatus: 'active',
    });

    // Get only inactive prices
    const inactiveResult = await caller.prices.getAll({
      page: 1,
      pageSize: 999999,
      filterStatus: 'inactive',
    });

    console.log(`Total: ${allResult.total}, Active: ${activeResult.total}, Inactive: ${inactiveResult.total}`);

    // All active items should have active=true
    activeResult.items.forEach((item: any) => {
      expect(item.price?.active).toBe(true);
    });

    // All inactive items should have active=false
    inactiveResult.items.forEach((item: any) => {
      expect(item.price?.active).toBe(false);
    });
  });

  it('should apply API filter correctly', async () => {
    // Get all APIs
    const apisResult = await caller.apis.list();
    
    if (apisResult.length === 0) {
      console.log('No APIs found, skipping API filter test');
      return;
    }

    const firstApi = apisResult[0];
    console.log(`Testing with API: ${firstApi.name} (ID: ${firstApi.id})`);

    // Get prices filtered by first API
    const result = await caller.prices.getAll({
      page: 1,
      pageSize: 999999,
      filterApi: firstApi.id.toString(),
    });

    console.log(`Services with API ${firstApi.name}: ${result.total}`);

    // All returned items should be from the selected API
    result.items.forEach((item: any) => {
      expect(item.price?.apiId).toBe(firstApi.id);
    });
  });

  it('should combine multiple filters correctly', async () => {
    // Get all APIs
    const apisResult = await caller.apis.list();
    
    if (apisResult.length === 0) {
      console.log('No APIs found, skipping combined filter test');
      return;
    }

    const firstApi = apisResult[0];

    // Apply multiple filters at once
    const result = await caller.prices.getAll({
      page: 1,
      pageSize: 999999,
      filterCountry: 'us',
      filterStatus: 'active',
      filterApi: firstApi.id.toString(),
    });

    console.log(`US + Active + API ${firstApi.name}: ${result.total}`);

    // All items should match all filters
    result.items.forEach((item: any) => {
      expect(item.country?.code).toBe('us');
      expect(item.price?.active).toBe(true);
      expect(item.price?.apiId).toBe(firstApi.id);
    });
  });
});
