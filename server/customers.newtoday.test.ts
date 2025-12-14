import { describe, it, expect, beforeAll } from 'vitest';
import { getDb } from './db';
import { customers } from '../drizzle/schema';
import { getNewCustomersToday } from './customers-helpers';
import { sql } from 'drizzle-orm';

describe('customers.getNewCustomersToday', () => {
  beforeAll(async () => {
    // Ensure database connection is available
    const db = await getDb();
    expect(db).toBeDefined();
  });

  it('should return count of customers created today', async () => {
    const count = await getNewCustomersToday();
    
    // Count should be a non-negative number
    expect(typeof count).toBe('number');
    expect(count).toBeGreaterThanOrEqual(0);
  });

  it('should only count customers created today (not yesterday or earlier)', async () => {
    const db = await getDb();
    if (!db) throw new Error('Database not available');

    // Get start of today in Brazil timezone (UTC-3)
    const now = new Date();
    const brazilOffset = -3 * 60; // UTC-3 in minutes
    const localOffset = now.getTimezoneOffset(); // Current timezone offset
    const offsetDiff = brazilOffset - localOffset;
    
    const todayBrazil = new Date(now.getTime() + offsetDiff * 60 * 1000);
    todayBrazil.setHours(0, 0, 0, 0);
    
    // Convert back to UTC for database query
    const startOfDayUTC = new Date(todayBrazil.getTime() - offsetDiff * 60 * 1000);

    // Query database directly to verify
    const result = await db
      .select({ count: sql<number>`CAST(COUNT(*) AS UNSIGNED)` })
      .from(customers)
      .where(sql`${customers.createdAt} >= ${startOfDayUTC}`);

    const dbCount = result[0]?.count || 0;
    const helperCount = await getNewCustomersToday();

    // Both counts should match
    expect(helperCount).toBe(dbCount);
  });

  it('should return 0 if no customers were created today', async () => {
    const db = await getDb();
    if (!db) throw new Error('Database not available');

    // Get all customers created today
    const now = new Date();
    const brazilOffset = -3 * 60;
    const localOffset = now.getTimezoneOffset();
    const offsetDiff = brazilOffset - localOffset;
    
    const todayBrazil = new Date(now.getTime() + offsetDiff * 60 * 1000);
    todayBrazil.setHours(0, 0, 0, 0);
    const startOfDayUTC = new Date(todayBrazil.getTime() - offsetDiff * 60 * 1000);

    const todayCustomers = await db
      .select()
      .from(customers)
      .where(sql`${customers.createdAt} >= ${startOfDayUTC}`);

    const count = await getNewCustomersToday();

    // If no customers today, count should be 0
    if (todayCustomers.length === 0) {
      expect(count).toBe(0);
    } else {
      // Otherwise, count should match the number of customers
      expect(count).toBe(todayCustomers.length);
    }
  });
});
