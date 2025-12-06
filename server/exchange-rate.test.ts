import { describe, it, expect, beforeAll, afterAll, vi, beforeEach } from 'vitest';
import { fetchExchangeRate, updateExchangeRateForAPIs, recalculatePricesForAPI, syncExchangeRateAndPrices, getExchangeRateInfo } from './exchange-rate';
import { getDb } from './db';
import { smsApis, prices } from '../drizzle/schema';
import { eq } from 'drizzle-orm';

// Mock fetch globally
global.fetch = vi.fn();

describe('Exchange Rate System', () => {
  let testApiId: number;

  beforeEach(() => {
    // Reset and setup fetch mock before each test
    vi.clearAllMocks();
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({
        USDBRL: {
          code: 'USD',
          codein: 'BRL',
          name: 'Dólar Americano/Real Brasileiro',
          high: '6.10',
          low: '6.05',
          varBid: '0.05',
          pctChange: '0.82',
          bid: '6.08',
          ask: '6.09',
          timestamp: Date.now().toString(),
          create_date: new Date().toISOString()
        }
      })
    });
  });

  beforeAll(async () => {
    // Create a test USD API
    const db = await getDb();
    if (!db) throw new Error('Database not available');

    const [result] = await db.insert(smsApis).values({
      name: 'Test USD API',
      url: 'https://test.api',
      token: 'test-token',
      currency: 'USD',
      exchangeRate: '5.00',
      profitPercentage: '50.00',
      minimumPrice: 100,
      active: true,
      priority: 999
    });

    testApiId = result.insertId;

    // Create test price
    await db.insert(prices).values({
      apiId: testApiId,
      countryId: 1,
      serviceId: 1,
      smshubPrice: 100, // $1.00 in cents
      ourPrice: 500, // Will be recalculated
      quantityAvailable: 10,
      active: true
    });
  });

  afterAll(async () => {
    // Cleanup test data
    const db = await getDb();
    if (!db) return;

    await db.delete(prices).where(eq(prices.apiId, testApiId));
    await db.delete(smsApis).where(eq(smsApis.id, testApiId));
  });

  describe('fetchExchangeRate', () => {
    it('should fetch current USD/BRL rate from ExchangeRate-API (primary)', async () => {
      const rate = await fetchExchangeRate();
      
      expect(rate).toBeTypeOf('number');
      expect(rate).toBeGreaterThan(0);
      expect(rate).toBeLessThan(20); // Reasonable upper bound
    }, 10000); // 10s timeout for API call

    it('should return a valid exchange rate format', async () => {
      const rate = await fetchExchangeRate();
      
      // Should have at most 2 decimal places
      const decimals = (rate.toString().split('.')[1] || '').length;
      expect(decimals).toBeLessThanOrEqual(4);
    }, 10000);
  });

  describe('updateExchangeRateForAPIs', () => {
    it('should update exchange rate for USD APIs', async () => {
      const count = await updateExchangeRateForAPIs();
      
      expect(count).toBeGreaterThanOrEqual(1); // At least our test API
    }, 10000);

    it('should update the exchangeRate field in database', async () => {
      await updateExchangeRateForAPIs();
      
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      const [api] = await db
        .select()
        .from(smsApis)
        .where(eq(smsApis.id, testApiId));

      expect(api).toBeDefined();
      expect(parseFloat(api.exchangeRate)).toBeGreaterThan(0);
    }, 10000);
  });

  describe('recalculatePricesForAPI', () => {
    it('should recalculate prices based on new exchange rate', async () => {
      // First update exchange rate
      await updateExchangeRateForAPIs();
      
      // Then recalculate prices
      const count = await recalculatePricesForAPI(testApiId);
      
      expect(count).toBeGreaterThanOrEqual(1);
    }, 10000);

    it('should apply profit percentage correctly', async () => {
      await updateExchangeRateForAPIs();
      await recalculatePricesForAPI(testApiId);
      
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      const [price] = await db
        .select()
        .from(prices)
        .where(eq(prices.apiId, testApiId));

      const [api] = await db
        .select()
        .from(smsApis)
        .where(eq(smsApis.id, testApiId));

      // Calculate expected price
      const rate = parseFloat(api.exchangeRate);
      const smshubPriceBRL = Math.round(price.smshubPrice * rate);
      const profitPercentage = parseFloat(api.profitPercentage);
      const expectedPrice = Math.round(smshubPriceBRL * (1 + profitPercentage / 100));
      const finalExpected = Math.max(expectedPrice, api.minimumPrice);

      expect(price.ourPrice).toBe(finalExpected);
    }, 10000);

    it('should respect minimum price', async () => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      // Update API to have high minimum price
      await db
        .update(smsApis)
        .set({ minimumPrice: 1000 })
        .where(eq(smsApis.id, testApiId));

      await recalculatePricesForAPI(testApiId);

      const [price] = await db
        .select()
        .from(prices)
        .where(eq(prices.apiId, testApiId));

      expect(price.ourPrice).toBeGreaterThanOrEqual(1000);
    }, 10000);
  });

  describe('syncExchangeRateAndPrices', () => {
    it('should perform full synchronization', async () => {
      const result = await syncExchangeRateAndPrices();
      
      expect(result.apisUpdated).toBeGreaterThanOrEqual(1);
      expect(result.pricesRecalculated).toBeGreaterThanOrEqual(1);
    }, 15000);
  });

  describe('getExchangeRateInfo', () => {
    it('should return exchange rate info', async () => {
      await updateExchangeRateForAPIs();
      
      const info = await getExchangeRateInfo();
      
      expect(info).toBeDefined();
      if (info) {
        expect(info.rate).toBeGreaterThan(0);
        expect(info.lastUpdate).toBeInstanceOf(Date);
        expect(info.nextUpdate).toBeInstanceOf(Date);
      }
    }, 10000);

    it('should calculate next update time correctly (every 2 hours)', async () => {
      await updateExchangeRateForAPIs();
      
      const info = await getExchangeRateInfo();
      
      expect(info).toBeDefined();
      if (info) {
        const now = new Date();
        const nextUpdate = info.nextUpdate;
        
        // Next update should be in the future
        expect(nextUpdate.getTime()).toBeGreaterThan(now.getTime());
        
        // Next update should be at an even hour (0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22)
        expect(nextUpdate.getHours() % 2).toBe(0);
        expect(nextUpdate.getMinutes()).toBe(0);
      }
    }, 10000);
  });
});
