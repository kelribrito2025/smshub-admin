import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { getDb } from './db';
import { customers, balanceTransactions } from '../drizzle/schema';
import { addBalance, deleteCustomer } from './customers-helpers';
import { eq, desc } from 'drizzle-orm';

describe('Balance Transaction Origin', () => {
  let testCustomerId: number;
  const testEmail = `origin-test-${Date.now()}@example.com`;

  beforeAll(async () => {
    const db = await getDb();
    if (!db) throw new Error('Database not available');

    // Create test customer
    const [customer] = await db.insert(customers).values({
      pin: Math.floor(Math.random() * 900000) + 100000, // Random 6-digit PIN
      name: 'Origin Test Customer',
      email: testEmail,
      password: 'test123',
      balance: 10000, // R$ 100.00
      active: true,
    }).$returningId();

    testCustomerId = customer.id;
  });

  afterAll(async () => {
    // Cleanup
    if (testCustomerId) {
      await deleteCustomer(testCustomerId);
    }
  });

  it('should set origin to "admin" when createdBy is provided', async () => {
    const db = await getDb();
    if (!db) throw new Error('Database not available');

    const adminUserId = 1; // Mock admin user ID

    // Add balance as admin
    await addBalance(
      testCustomerId,
      5000, // R$ 50.00
      'credit',
      'Adição manual pelo admin',
      adminUserId
    );

    // Get the latest transaction (desc order)
    const [transaction] = await db
      .select()
      .from(balanceTransactions)
      .where(eq(balanceTransactions.customerId, testCustomerId))
      .orderBy(desc(balanceTransactions.createdAt))
      .limit(1);

    expect(transaction).toBeDefined();
    expect(transaction.origin).toBe('admin');
    expect(transaction.createdBy).toBe(adminUserId);
  });

  it('should set origin to "system" when createdBy is not provided', async () => {
    const db = await getDb();
    if (!db) throw new Error('Database not available');

    const uniqueDescription = `Operação automática do sistema - ${Date.now()}`;

    // Add balance without createdBy (system operation)
    await addBalance(
      testCustomerId,
      3000, // R$ 30.00
      'credit',
      uniqueDescription
      // No createdBy parameter
    );

    // Find the specific transaction we just created
    const allTransactions = await db
      .select()
      .from(balanceTransactions)
      .where(eq(balanceTransactions.customerId, testCustomerId));

    const transaction = allTransactions.find(t => t.description === uniqueDescription);

    expect(transaction).toBeDefined();
    expect(transaction!.origin).toBe('system');
    expect(transaction!.createdBy).toBeNull();
  });

  it('should show "Admin" in frontend for admin-created transactions', async () => {
    const db = await getDb();
    if (!db) throw new Error('Database not available');

    const adminUserId = 1;

    // Test different admin actions
    const adminActions = [
      { type: 'credit' as const, description: 'Adicionar saldo' },
      { type: 'debit' as const, description: 'Debitar saldo' },
      { type: 'refund' as const, description: 'Reembolsar saque' },
      { type: 'hold' as const, description: 'Reter saldo' },
    ];

    for (const action of adminActions) {
      await addBalance(
        testCustomerId,
        action.type === 'debit' || action.type === 'hold' ? -1000 : 1000,
        action.type,
        action.description,
        adminUserId
      );
    }

    // Get all transactions created by admin
    const adminTransactions = await db
      .select()
      .from(balanceTransactions)
      .where(eq(balanceTransactions.customerId, testCustomerId));

    const adminCreatedTransactions = adminTransactions.filter(t => t.createdBy === adminUserId);

    expect(adminCreatedTransactions.length).toBeGreaterThanOrEqual(4);
    
    // All admin-created transactions should have origin="admin"
    adminCreatedTransactions.forEach(transaction => {
      expect(transaction.origin).toBe('admin');
      expect(transaction.createdBy).toBe(adminUserId);
    });
  });
});
