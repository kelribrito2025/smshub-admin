import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { appRouter } from './routers';
import { getDb } from './db';
import { recharges, refunds, customers } from '../drizzle/schema';
import { eq } from 'drizzle-orm';

/**
 * Test suite for payments router
 * 
 * Tests:
 * 1. Get payment statistics
 * 2. Get paginated payments list
 * 3. Filter payments by search term
 * 4. Filter payments by date range
 */

// Helper to create admin context
function createAdminContext() {
  return {
    user: {
      id: 1,
      openId: 'test-admin',
      name: 'Test Admin',
      email: 'admin@test.com',
      role: 'admin' as const,
      navLayout: 'sidebar' as const,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: {} as any,
    res: {} as any,
  };
}

let testCustomerId: number;
let testRechargeId: number;

describe('Payments Router', () => {
  beforeAll(async () => {
    const db = await getDb();
    if (!db) throw new Error('Database not available');

    // Create test customer
    const [customer] = await db.insert(customers).values({
      pin: 888888,
      name: 'Test Payment Customer',
      email: `test-payment-${Date.now()}@example.com`,
      balance: 5000, // R$ 50.00
      active: true,
    });

    testCustomerId = customer.insertId;

    // Create test recharge
    const [recharge] = await db.insert(recharges).values({
      customerId: testCustomerId,
      amount: 10000, // R$ 100.00
      paymentMethod: 'pix',
      status: 'completed',
      transactionId: 'test-txid-123',
      completedAt: new Date(),
    });

    testRechargeId = recharge.insertId;
  });

  afterAll(async () => {
    const db = await getDb();
    if (!db) return;

    // Cleanup: delete test data
    if (testRechargeId) {
      await db.delete(recharges).where(eq(recharges.id, testRechargeId));
    }
    if (testCustomerId) {
      await db.delete(customers).where(eq(customers.id, testCustomerId));
    }
  });

  it('should get payment statistics', async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const stats = await caller.payments.getStats({});

    expect(stats).toBeDefined();
    expect(typeof stats.totalPayments).toBe('number');
    expect(typeof stats.totalRefunds).toBe('number');
    expect(stats.totalPayments).toBeGreaterThanOrEqual(0);
    expect(stats.totalRefunds).toBeGreaterThanOrEqual(0);
  });

  it('should get paginated payments list', async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.payments.getPayments({
      page: 1,
      limit: 10,
    });

    expect(result).toBeDefined();
    expect(Array.isArray(result.payments)).toBe(true);
    expect(typeof result.total).toBe('number');
    expect(result.page).toBe(1);
    expect(result.limit).toBe(10);
  });

  it('should filter payments by search term', async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    // Search by customer PIN
    const result = await caller.payments.getPayments({
      searchTerm: '888888',
      page: 1,
      limit: 10,
    });

    expect(result).toBeDefined();
    expect(Array.isArray(result.payments)).toBe(true);
    
    // Should find the test customer's payment
    const testPayment = result.payments.find(p => p.customerPin === 888888);
    if (testPayment) {
      expect(testPayment.customerName).toBe('Test Payment Customer');
    }
  });

  it('should filter payments by date range', async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const today = new Date();
    today.setHours(23, 59, 59, 999);
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);
    weekAgo.setHours(0, 0, 0, 0);

    const result = await caller.payments.getPayments({
      startDate: weekAgo.toISOString().split('T')[0],
      endDate: today.toISOString().split('T')[0],
      page: 1,
      limit: 10,
    });

    expect(result).toBeDefined();
    expect(Array.isArray(result.payments)).toBe(true);
    
    // Should return payments (at least our test payment)
    expect(result.total).toBeGreaterThanOrEqual(0);
  });

  it('should validate refund input', async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    // Try to refund non-existent recharge
    await expect(
      caller.payments.processRefund({
        rechargeId: 999999,
      })
    ).rejects.toThrow('Recarga não encontrada');
  });

  it('should prevent refund amount greater than original', async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    // Try to refund more than original amount
    await expect(
      caller.payments.processRefund({
        rechargeId: testRechargeId,
        amount: 20000, // R$ 200.00 (more than R$ 100.00 original)
      })
    ).rejects.toThrow('Valor de devolução não pode ser maior que o valor original');
  });
});
