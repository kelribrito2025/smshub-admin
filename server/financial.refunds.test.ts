import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { appRouter } from './routers';
import { getDb } from './db';
import { balanceTransactions, customers } from '../drizzle/schema';
import { eq } from 'drizzle-orm';

describe('Financial - Total Refunds', () => {
  let testCustomerId: number;
  let testAdminUserId = 1; // Assuming admin user ID is 1

  beforeAll(async () => {
    const db = await getDb();
    if (!db) throw new Error('Database not available');

    // Create a test customer
    const [customer] = await db.insert(customers).values({
      pin: 99999,
      name: 'Test Customer for Refunds',
      email: 'test-refunds@example.com',
      balance: 10000, // R$ 100.00
      active: true,
    });
    testCustomerId = customer.insertId;
  });

  afterAll(async () => {
    const db = await getDb();
    if (!db) return;

    // Clean up test data
    await db.delete(balanceTransactions).where(eq(balanceTransactions.customerId, testCustomerId));
    await db.delete(customers).where(eq(customers.id, testCustomerId));
  });

  it('should calculate total refunds made by admin', async () => {
    const db = await getDb();
    if (!db) throw new Error('Database not available');

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    // Create tRPC caller with mock context
    const caller = appRouter.createCaller({
      user: { id: testAdminUserId, role: 'admin' } as any,
      req: {} as any,
      res: {} as any,
    });

    // Get initial refunds count
    const initialRefunds = await caller.financial.getTotalRefunds({
      startDate: today,
      endDate: todayEnd,
    });

    // Insert test refund transactions
    await db.insert(balanceTransactions).values([
      {
        customerId: testCustomerId,
        amount: -5000, // R$ 50.00 refund (negative)
        type: 'refund',
        origin: 'admin',
        description: 'Test refund 1',
        balanceBefore: 10000,
        balanceAfter: 15000,
        createdBy: testAdminUserId,
        createdAt: today,
      },
      {
        customerId: testCustomerId,
        amount: -2657, // R$ 26.57 refund
        type: 'refund',
        origin: 'admin',
        description: 'Test refund 2',
        balanceBefore: 15000,
        balanceAfter: 17657,
        createdBy: testAdminUserId,
        createdAt: today,
      },
      {
        customerId: testCustomerId,
        amount: -1000, // R$ 10.00 refund by system (should NOT be counted)
        type: 'refund',
        origin: 'system',
        description: 'System refund',
        balanceBefore: 17657,
        balanceAfter: 18657,
        createdAt: today,
      },
    ]);

    // Test getTotalRefunds for today after insertions
    const totalRefundsToday = await caller.financial.getTotalRefunds({
      startDate: today,
      endDate: todayEnd,
    });

    // Should be initial + 5000 + 2657 = initial + 7657 cents (R$ 76.57)
    // System refund should NOT be included
    expect(totalRefundsToday).toBe(initialRefunds + 7657);
  });

  it('should return 0 when no admin refunds exist', async () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 2);
    yesterday.setHours(0, 0, 0, 0);
    const yesterdayEnd = new Date(yesterday);
    yesterdayEnd.setHours(23, 59, 59, 999);

    const caller = appRouter.createCaller({
      user: { id: testAdminUserId, role: 'admin' } as any,
      req: {} as any,
      res: {} as any,
    });

    const totalRefunds = await caller.financial.getTotalRefunds({
      startDate: yesterday,
      endDate: yesterdayEnd,
    });

    expect(totalRefunds).toBe(0);
  });

  it('should work without date filters', async () => {
    const caller = appRouter.createCaller({
      user: { id: testAdminUserId, role: 'admin' } as any,
      req: {} as any,
      res: {} as any,
    });

    const totalRefunds = await caller.financial.getTotalRefunds();

    // Should include all refunds from all time
    expect(totalRefunds).toBeGreaterThanOrEqual(7657);
  });
});
