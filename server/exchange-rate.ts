/**
 * Exchange Rate Management
 * 
 * Fetches USD/BRL exchange rate with automatic fallback:
 * 1. ExchangeRate-API (primary) - International API, 1500 req/month free
 * 2. AwesomeAPI (backup) - Brazilian API
 */

import cron from 'node-cron';
import { getDb } from './db';
import { prices, smsApis } from '../drizzle/schema';
import { eq } from 'drizzle-orm';

interface AwesomeAPIResponse {
  USDBRL: {
    code: string;
    codein: string;
    name: string;
    high: string;
    low: string;
    varBid: string;
    pctChange: string;
    bid: string;
    ask: string;
    timestamp: string;
    create_date: string;
  };
}

interface ExchangeRateAPIResponse {
  base: string;
  date: string;
  rates: {
    BRL: number;
    [key: string]: number;
  };
}

/**
 * Fetch USD/BRL from AwesomeAPI (backup source)
 */
async function fetchFromAwesomeAPI(): Promise<number> {
  const response = await fetch('https://economia.awesomeapi.com.br/json/last/USD-BRL');
  
  if (!response.ok) {
    throw new Error(`AwesomeAPI returned ${response.status}`);
  }

  const data = await response.json() as AwesomeAPIResponse;
  const rate = parseFloat(data.USDBRL.bid);
  
  if (isNaN(rate) || rate <= 0) {
    throw new Error(`Invalid exchange rate: ${data.USDBRL.bid}`);
  }

  console.log(`[Exchange Rate] ✅ AwesomeAPI: ${rate} (${data.USDBRL.create_date})`);
  return rate;
}

/**
 * Fetch USD/BRL from ExchangeRate-API (primary source)
 */
async function fetchFromExchangeRateAPI(): Promise<number> {
  const response = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
  
  if (!response.ok) {
    throw new Error(`ExchangeRate-API returned ${response.status}`);
  }

  const data = await response.json() as ExchangeRateAPIResponse;
  const rate = data.rates.BRL;
  
  if (isNaN(rate) || rate <= 0) {
    throw new Error(`Invalid exchange rate: ${rate}`);
  }

  console.log(`[Exchange Rate] ✅ ExchangeRate-API: ${rate} (${data.date})`);
  return rate;
}

/**
 * Fetch current USD/BRL exchange rate with automatic fallback
 * 1. ExchangeRate-API (primary) - International API, 1500 req/month free
 * 2. AwesomeAPI (backup) - Brazilian API, free tier
 */
export async function fetchExchangeRate(): Promise<number> {
  // Try ExchangeRate-API first (primary)
  try {
    return await fetchFromExchangeRateAPI();
  } catch (exchangeRateError) {
    console.warn('[Exchange Rate] ⚠️ ExchangeRate-API failed, trying backup...', exchangeRateError);
    
    // Fallback to AwesomeAPI
    try {
      return await fetchFromAwesomeAPI();
    } catch (backupError) {
      console.error('[Exchange Rate] ❌ All APIs failed!');
      console.error('  - ExchangeRate-API:', exchangeRateError);
      console.error('  - AwesomeAPI:', backupError);
      throw new Error('Failed to fetch exchange rate from all sources');
    }
  }
}

/**
 * Update exchange rate for all APIs with USD currency
 * Returns number of APIs updated
 */
export async function updateExchangeRateForAPIs(): Promise<number> {
  try {
    const rate = await fetchExchangeRate();
    
    // Get all SMS APIs with USD currency
    const db = await getDb();
    if (!db) throw new Error('Database not available');
    const usdAPIs = await db
      .select()
      .from(smsApis)
      .where(eq(smsApis.currency, 'USD'));

    if (usdAPIs.length === 0) {
      console.log('[Exchange Rate] No USD APIs found to update');
      return 0;
    }

    // Update exchange rate for each USD API
    let updated = 0;
    for (const api of usdAPIs) {
      await db
        .update(smsApis)
        .set({ 
          exchangeRate: rate.toString(),
          updatedAt: new Date()
        })
        .where(eq(smsApis.id, api.id));
      
      updated++;
    }

    console.log(`[Exchange Rate] Updated ${updated} USD APIs with rate ${rate}`);
    return updated;
  } catch (error) {
    console.error('[Exchange Rate] Failed to update APIs:', error);
    throw error;
  }
}

/**
 * Recalculate all prices for a specific API after exchange rate change
 * This ensures prices in BRL reflect the new USD/BRL rate
 */
export async function recalculatePricesForAPI(apiId: number): Promise<number> {
  try {
    // Get API settings
    const db = await getDb();
    if (!db) throw new Error('Database not available');
    const [apiSettings] = await db
      .select()
      .from(smsApis)
      .where(eq(smsApis.id, apiId));

    if (!apiSettings) {
      throw new Error(`API settings not found: ${apiId}`);
    }

    if (apiSettings.currency !== 'USD') {
      console.log(`[Exchange Rate] API ${apiId} is not USD, skipping price recalculation`);
      return 0;
    }

    const rate = parseFloat(apiSettings.exchangeRate);
    if (!rate || rate <= 0) {
      throw new Error(`Invalid exchange rate for API ${apiId}: ${rate}`);
    }

    // Get all prices for this API
    const apiPrices = await db
      .select()
      .from(prices)
      .where(eq(prices.apiId, apiId));

    if (apiPrices.length === 0) {
      console.log(`[Exchange Rate] No prices found for API ${apiId}`);
      return 0;
    }

    // Recalculate each price
    let updated = 0;
    for (const price of apiPrices) {
      // smshubPrice is in USD (cents), convert to BRL (cents)
      const smshubPriceBRL = Math.round(price.smshubPrice * rate);
      
      // Apply profit percentage to get our price
      const profitPercentage = parseFloat(apiSettings.profitPercentage) || 0;
      const ourPriceBRL = Math.round(smshubPriceBRL * (1 + profitPercentage / 100));
      
      // Apply minimum price if set
      const finalPrice = Math.max(ourPriceBRL, apiSettings.minimumPrice);

      await db
        .update(prices)
        .set({
          ourPrice: finalPrice,
          lastSync: new Date()
        })
        .where(eq(prices.id, price.id));

      updated++;
    }

    console.log(`[Exchange Rate] Recalculated ${updated} prices for API ${apiId} with rate ${rate}`);
    return updated;
  } catch (error) {
    console.error(`[Exchange Rate] Failed to recalculate prices for API ${apiId}:`, error);
    throw error;
  }
}

/**
 * Full synchronization: update exchange rates and recalculate all prices
 */
export async function syncExchangeRateAndPrices(): Promise<{
  apisUpdated: number;
  pricesRecalculated: number;
}> {
  console.log('[Exchange Rate] Starting full synchronization...');
  
  const apisUpdated = await updateExchangeRateForAPIs();
  
  // Get all USD APIs
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  const usdAPIs = await db
    .select()
    .from(smsApis)
    .where(eq(smsApis.currency, 'USD'));

  let totalPrices = 0;
  for (const api of usdAPIs) {
    const pricesUpdated = await recalculatePricesForAPI(api.id);
    totalPrices += pricesUpdated;
  }

  console.log(`[Exchange Rate] Sync complete: ${apisUpdated} APIs, ${totalPrices} prices recalculated`);
  
  return {
    apisUpdated,
    pricesRecalculated: totalPrices
  };
}

/**
 * Initialize automatic exchange rate update
 * Runs every 2 hours (12x per day) to keep rates fresh
 * Consumes ~360 requests/month (well below 1500 limit)
 */
export function initExchangeRateCron() {
  // Run every 2 hours: 0:00, 2:00, 4:00, 6:00, 8:00, 10:00, 12:00, 14:00, 16:00, 18:00, 20:00, 22:00
  cron.schedule('0 */2 * * *', async () => {
    console.log('[Exchange Rate Cron] Starting automatic update (every 2 hours)...');
    try {
      await syncExchangeRateAndPrices();
      console.log('[Exchange Rate Cron] Update completed successfully');
    } catch (error) {
      console.error('[Exchange Rate Cron] Update failed:', error);
    }
  }, {
    timezone: 'America/Sao_Paulo'
  });

  console.log('[Exchange Rate Cron] Initialized - will run every 2 hours (12x per day, ~360 req/month)');
}

/**
 * Get last exchange rate update info for display
 */
export async function getExchangeRateInfo() {
  try {
    // Get the most recently updated USD API
    const db = await getDb();
    if (!db) return null;
    const [latestAPI] = await db
      .select()
      .from(smsApis)
      .where(eq(smsApis.currency, 'USD'))
      .orderBy(smsApis.updatedAt)
      .limit(1);

    if (!latestAPI) {
      return null;
    }

    return {
      rate: parseFloat(latestAPI.exchangeRate),
      lastUpdate: latestAPI.updatedAt,
      nextUpdate: getNextUpdateTime()
    };
  } catch (error) {
    console.error('[Exchange Rate] Failed to get info:', error);
    return null;
  }
}

/**
 * Calculate next scheduled update time (every 2 hours)
 */
function getNextUpdateTime(): Date {
  const now = new Date();
  const next = new Date(now);
  
  // Calculate next even hour (0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22)
  const currentHour = now.getHours();
  const nextEvenHour = Math.ceil((currentHour + 1) / 2) * 2;
  
  if (nextEvenHour >= 24) {
    // Next update is tomorrow at 0:00
    next.setDate(next.getDate() + 1);
    next.setHours(0, 0, 0, 0);
  } else {
    // Next update is today at next even hour
    next.setHours(nextEvenHour, 0, 0, 0);
  }
  
  return next;
}
