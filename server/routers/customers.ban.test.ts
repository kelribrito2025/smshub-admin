import { describe, it, expect, beforeAll } from 'vitest';
import { appRouter } from '../routers';
import { getDb } from '../db';
import { customers } from '../../drizzle/schema';
import { eq } from 'drizzle-orm';

describe('Customer Ban System', () => {
  let testCustomerId: number;
  let caller: ReturnType<typeof appRouter.createCaller>;

  beforeAll(async () => {
    const db = await getDb();
    if (!db) throw new Error('Database not available');

    // Create test customer
    const result = await db.insert(customers).values({
      pin: 999999,
      name: 'Test Ban Customer',
      email: `test-ban-${Date.now()}@example.com`,
      balance: 0,
      bonusBalance: 0,
      active: true,
      banned: false,
    });

    testCustomerId = Number(result[0].insertId);

    // Create caller with admin context
    caller = appRouter.createCaller({
      user: { id: 1, role: 'admin' as const },
      customer: null,
    });
  });

  it('should ban a customer successfully', async () => {
    const result = await caller.customers.banCustomer({
      id: testCustomerId,
      reason: 'Test ban reason',
    });

    expect(result.success).toBe(true);

    // Verify customer is banned in database
    const db = await getDb();
    if (!db) throw new Error('Database not available');

    const customer = await db
      .select()
      .from(customers)
      .where(eq(customers.id, testCustomerId))
      .limit(1);

    expect(customer[0].banned).toBe(true);
    expect(customer[0].bannedReason).toBe('Test ban reason');
    expect(customer[0].bannedAt).toBeTruthy();
  });

  it('should not allow banning an already banned customer', async () => {
    await expect(
      caller.customers.banCustomer({
        id: testCustomerId,
      })
    ).rejects.toThrow('Customer is already banned');
  });

  it('should unban a customer successfully', async () => {
    const result = await caller.customers.unbanCustomer({
      id: testCustomerId,
    });

    expect(result.success).toBe(true);

    // Verify customer is unbanned in database
    const db = await getDb();
    if (!db) throw new Error('Database not available');

    const customer = await db
      .select()
      .from(customers)
      .where(eq(customers.id, testCustomerId))
      .limit(1);

    expect(customer[0].banned).toBe(false);
    expect(customer[0].bannedReason).toBeNull();
    expect(customer[0].bannedAt).toBeNull();
  });

  it('should not allow unbanning a customer that is not banned', async () => {
    await expect(
      caller.customers.unbanCustomer({
        id: testCustomerId,
      })
    ).rejects.toThrow('Customer is not banned');
  });
});
