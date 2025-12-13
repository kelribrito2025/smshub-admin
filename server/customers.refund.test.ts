import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { appRouter } from './routers';
import type { TrpcContext } from './_core/context';
import { getDb } from './db';
import { customers, balanceTransactions } from '../drizzle/schema';
import { eq } from 'drizzle-orm';

type AuthenticatedUser = NonNullable<TrpcContext['user']>;

function createAdminContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: 'admin-user',
    email: 'admin@example.com',
    name: 'Admin User',
    loginMethod: 'manus',
    role: 'admin',
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

/**
 * Test suite for customer refund functionality
 * 
 * Tests:
 * 1. Refund a purchase transaction successfully
 * 2. Prevent refunding non-purchase transactions
 * 3. Prevent double refunds
 * 4. Verify balance is updated correctly after refund
 */

describe('Customer Refund', () => {
  let testCustomerId: number;
  let testPurchaseTransactionId: number;
  let testCreditTransactionId: number;

  beforeAll(async () => {
    const db = await getDb();
    if (!db) throw new Error('Database not available');

    // Create test customer
    const [customer] = await db.insert(customers).values({
      pin: 999999,
      name: 'Test Refund Customer',
      email: `test-refund-${Date.now()}@example.com`,
      balance: 10000, // R$ 100.00
      active: true,
    });
    testCustomerId = customer.insertId;

    // Create a purchase transaction (negative amount)
    const [purchaseTx] = await db.insert(balanceTransactions).values({
      customerId: testCustomerId,
      amount: -500, // -R$ 5.00
      type: 'purchase',
      description: 'Test purchase for refund',
      balanceBefore: 10000,
      balanceAfter: 9500,
      origin: 'customer',
      relatedActivationId: 12345,
    });
    testPurchaseTransactionId = purchaseTx.insertId;

    // Create a credit transaction (should not be refundable)
    const [creditTx] = await db.insert(balanceTransactions).values({
      customerId: testCustomerId,
      amount: 1000, // +R$ 10.00
      type: 'credit',
      description: 'Test credit',
      balanceBefore: 9500,
      balanceAfter: 10500,
      origin: 'admin',
    });
    testCreditTransactionId = creditTx.insertId;

    // Update customer balance to reflect transactions
    await db.update(customers).set({ balance: 10500 }).where(eq(customers.id, testCustomerId));
  });

  afterAll(async () => {
    const db = await getDb();
    if (!db) return;

    // Clean up test data
    await db.delete(balanceTransactions).where(eq(balanceTransactions.customerId, testCustomerId));
    await db.delete(customers).where(eq(customers.id, testCustomerId));
  });

  it('should refund a purchase transaction successfully', async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.customers.refundPurchase({
      transactionId: testPurchaseTransactionId,
      customerId: testCustomerId,
    });

    expect(result.success).toBe(true);
    expect(result.refundAmount).toBe(5.0); // R$ 5.00 refunded
    expect(result.balanceAfter).toBeGreaterThan(105); // Balance should increase

    // Verify refund transaction was created
    const db = await getDb();
    if (!db) throw new Error('Database not available');

    const refundTx = await db
      .select()
      .from(balanceTransactions)
      .where(eq(balanceTransactions.customerId, testCustomerId))
      .orderBy(balanceTransactions.createdAt)
      .limit(10);

    const refund = refundTx.find((tx) => tx.type === 'refund');
    expect(refund).toBeDefined();
    expect(refund?.amount).toBe(500); // +R$ 5.00 (positive)
    expect(refund?.description).toContain('Reembolso');
    expect(refund?.relatedActivationId).toBe(12345);
  });

  it('should prevent refunding non-purchase transactions', async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.customers.refundPurchase({
        transactionId: testCreditTransactionId,
        customerId: testCustomerId,
      })
    ).rejects.toThrow('Only purchase transactions can be refunded');
  });

  it('should prevent double refunds', async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    // Try to refund the same purchase again
    await expect(
      caller.customers.refundPurchase({
        transactionId: testPurchaseTransactionId,
        customerId: testCustomerId,
      })
    ).rejects.toThrow('This purchase has already been refunded');
  });

  it('should verify balance is updated correctly after refund', async () => {
    const db = await getDb();
    if (!db) throw new Error('Database not available');

    const [customer] = await db
      .select()
      .from(customers)
      .where(eq(customers.id, testCustomerId))
      .limit(1);

    // Balance should be: 10500 (initial) + 500 (refund) = 11000 cents = R$ 110.00
    expect(customer.balance).toBe(11000);
  });
});
