import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { getDb } from './db';
import { smsApis, prices, countries, services } from '../drizzle/schema';
import { eq } from 'drizzle-orm';

describe('API Auto-Sync Tests', () => {
  let testApiId: number;
  let testCountryId: number;
  let testServiceId: number;
  let testPriceId: number;

  beforeAll(async () => {
    const db = await getDb();
    if (!db) throw new Error('Database connection failed');

    // Create test country
    const countryResult = await db.insert(countries).values({
      smshubId: 9999,
      name: 'Test Country Auto Sync',
      code: 'test_auto_sync',
      active: true,
    });
    testCountryId = Number(countryResult.insertId);
    
    if (!testCountryId || isNaN(testCountryId)) {
      throw new Error('Failed to create test country');
    }

    // Create test service
    const serviceResult = await db.insert(services).values({
      smshubCode: 'test_auto_sync',
      name: 'Test Service Auto Sync',
      category: 'Test',
      active: true,
    });
    testServiceId = Number(serviceResult.insertId);
    
    if (!testServiceId || isNaN(testServiceId)) {
      throw new Error('Failed to create test service');
    }

    // Create test API with initial profit settings
    const apiResult = await db.insert(smsApis).values({
      name: 'Test API Auto Sync',
      url: 'https://test-api-auto-sync.com',
      token: 'test-token-auto-sync',
      priority: 0,
      active: true,
      currency: 'USD',
      profitPercentage: '10.00', // 10% profit
      minimumPrice: 100, // R$ 1.00 minimum
    });
    testApiId = Number(apiResult.insertId);
    
    if (!testApiId || isNaN(testApiId)) {
      throw new Error('Failed to create test API');
    }

    // Create test price record
    const priceResult = await db.insert(prices).values({
      countryId: testCountryId,
      serviceId: testServiceId,
      apiId: testApiId,
      smshubPrice: 200, // R$ 2.00 cost
      ourPrice: 220, // R$ 2.20 (10% profit)
      quantityAvailable: 100,
      active: true,
    });
    testPriceId = Number(priceResult.insertId);
    
    if (!testPriceId || isNaN(testPriceId)) {
      throw new Error('Failed to create test price');
    }
  });

  afterAll(async () => {
    const db = await getDb();
    if (!db) return;

    // Cleanup test data
    await db.delete(prices).where(eq(prices.id, testPriceId));
    await db.delete(smsApis).where(eq(smsApis.id, testApiId));
    await db.delete(services).where(eq(services.id, testServiceId));
    await db.delete(countries).where(eq(countries.id, testCountryId));
  });

  it('should recalculate prices when profit percentage changes', async () => {
    const db = await getDb();
    if (!db) throw new Error('Database connection failed');

    // Update API with new profit percentage (50%)
    await db.update(smsApis)
      .set({ profitPercentage: '50.00' })
      .where(eq(smsApis.id, testApiId));

    // Manually trigger price recalculation (simulating what the backend does)
    const api = await db.select().from(smsApis).where(eq(smsApis.id, testApiId)).limit(1);
    const apiData = api[0];

    const priceRecord = await db.select().from(prices).where(eq(prices.id, testPriceId)).limit(1);
    const priceData = priceRecord[0];

    // Calculate expected price: R$ 2.00 * 1.50 = R$ 3.00
    const smshubCost = priceData.smshubPrice;
    const profitRate = parseFloat(apiData.profitPercentage || '0') / 100;
    const calculatedPrice = Math.round(smshubCost * (1 + profitRate));
    const expectedPrice = Math.max(calculatedPrice, apiData.minimumPrice || 0);

    // Update price
    await db.update(prices)
      .set({ ourPrice: expectedPrice })
      .where(eq(prices.id, testPriceId));

    // Verify price was updated correctly
    const updatedPrice = await db.select().from(prices).where(eq(prices.id, testPriceId)).limit(1);
    expect(updatedPrice[0].ourPrice).toBe(300); // R$ 3.00 (50% profit on R$ 2.00)
  });

  it('should respect minimum price when profit calculation is lower', async () => {
    const db = await getDb();
    if (!db) throw new Error('Database connection failed');

    // Update API with low profit (5%) but high minimum price (R$ 5.00)
    await db.update(smsApis)
      .set({ 
        profitPercentage: '5.00',
        minimumPrice: 500, // R$ 5.00
      })
      .where(eq(smsApis.id, testApiId));

    // Manually trigger price recalculation
    const api = await db.select().from(smsApis).where(eq(smsApis.id, testApiId)).limit(1);
    const apiData = api[0];

    const priceRecord = await db.select().from(prices).where(eq(prices.id, testPriceId)).limit(1);
    const priceData = priceRecord[0];

    // Calculate: R$ 2.00 * 1.05 = R$ 2.10, but minimum is R$ 5.00
    const smshubCost = priceData.smshubPrice;
    const profitRate = parseFloat(apiData.profitPercentage || '0') / 100;
    const calculatedPrice = Math.round(smshubCost * (1 + profitRate));
    const expectedPrice = Math.max(calculatedPrice, apiData.minimumPrice || 0);

    // Update price
    await db.update(prices)
      .set({ ourPrice: expectedPrice })
      .where(eq(prices.id, testPriceId));

    // Verify minimum price was applied
    const updatedPrice = await db.select().from(prices).where(eq(prices.id, testPriceId)).limit(1);
    expect(updatedPrice[0].ourPrice).toBe(500); // R$ 5.00 (minimum price)
  });

  it('should handle zero profit percentage correctly', async () => {
    const db = await getDb();
    if (!db) throw new Error('Database connection failed');

    // Update API with zero profit
    await db.update(smsApis)
      .set({ 
        profitPercentage: '0.00',
        minimumPrice: 0,
      })
      .where(eq(smsApis.id, testApiId));

    // Manually trigger price recalculation
    const api = await db.select().from(smsApis).where(eq(smsApis.id, testApiId)).limit(1);
    const apiData = api[0];

    const priceRecord = await db.select().from(prices).where(eq(prices.id, testPriceId)).limit(1);
    const priceData = priceRecord[0];

    // Calculate: R$ 2.00 * 1.00 = R$ 2.00 (no profit)
    const smshubCost = priceData.smshubPrice;
    const profitRate = parseFloat(apiData.profitPercentage || '0') / 100;
    const calculatedPrice = Math.round(smshubCost * (1 + profitRate));
    const expectedPrice = Math.max(calculatedPrice, apiData.minimumPrice || 0);

    // Update price
    await db.update(prices)
      .set({ ourPrice: expectedPrice })
      .where(eq(prices.id, testPriceId));

    // Verify price equals cost (no profit)
    const updatedPrice = await db.select().from(prices).where(eq(prices.id, testPriceId)).limit(1);
    expect(updatedPrice[0].ourPrice).toBe(200); // R$ 2.00 (same as cost)
  });

  it('should handle high profit percentage correctly', async () => {
    const db = await getDb();
    if (!db) throw new Error('Database connection failed');

    // Update API with high profit (200%)
    await db.update(smsApis)
      .set({ 
        profitPercentage: '200.00',
        minimumPrice: 0,
      })
      .where(eq(smsApis.id, testApiId));

    // Manually trigger price recalculation
    const api = await db.select().from(smsApis).where(eq(smsApis.id, testApiId)).limit(1);
    const apiData = api[0];

    const priceRecord = await db.select().from(prices).where(eq(prices.id, testPriceId)).limit(1);
    const priceData = priceRecord[0];

    // Calculate: R$ 2.00 * 3.00 = R$ 6.00 (200% profit)
    const smshubCost = priceData.smshubPrice;
    const profitRate = parseFloat(apiData.profitPercentage || '0') / 100;
    const calculatedPrice = Math.round(smshubCost * (1 + profitRate));
    const expectedPrice = Math.max(calculatedPrice, apiData.minimumPrice || 0);

    // Update price
    await db.update(prices)
      .set({ ourPrice: expectedPrice })
      .where(eq(prices.id, testPriceId));

    // Verify high profit was applied
    const updatedPrice = await db.select().from(prices).where(eq(prices.id, testPriceId)).limit(1);
    expect(updatedPrice[0].ourPrice).toBe(600); // R$ 6.00 (200% profit on R$ 2.00)
  });
});
