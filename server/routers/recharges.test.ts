import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { appRouter } from '../routers';
import { getDb } from '../db';
import { recharges, customers } from '../../drizzle/schema';
import { eq } from 'drizzle-orm';

describe('Recharges Router', () => {
  let testCustomerId: number;
  let testRechargeIds: number[] = [];

  beforeAll(async () => {
    const db = await getDb();
    if (!db) throw new Error('Database connection failed');

    // Criar cliente de teste
    const customerResult = await db.insert(customers).values({
      pin: Math.floor(Math.random() * 1000000),
      name: 'Test Customer Recharges',
      email: `test-recharges-${Date.now()}@example.com`,
      balance: 0,
      bonusBalance: 0,
    });

    testCustomerId = Number(customerResult[0].insertId);

    // Criar recargas de teste
    const recharge1 = await db.insert(recharges).values({
      customerId: testCustomerId,
      amount: 5000,
      paymentMethod: 'pix',
      status: 'completed',
      createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 dias atrás
      completedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    });
    testRechargeIds.push(Number(recharge1[0].insertId));

    const recharge2 = await db.insert(recharges).values({
      customerId: testCustomerId,
      amount: 10000,
      paymentMethod: 'card',
      status: 'completed',
      createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 dias atrás
      completedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
    });
    testRechargeIds.push(Number(recharge2[0].insertId));

    const recharge3 = await db.insert(recharges).values({
      customerId: testCustomerId,
      amount: 2000,
      paymentMethod: 'pix',
      status: 'pending',
      createdAt: new Date(Date.now() - 1 * 60 * 60 * 1000), // 1 hora atrás
    });
    testRechargeIds.push(Number(recharge3[0].insertId));

    const recharge4 = await db.insert(recharges).values({
      customerId: testCustomerId,
      amount: 3000,
      paymentMethod: 'picpay',
      status: 'expired',
      createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 dias atrás
    });
    testRechargeIds.push(Number(recharge4[0].insertId));
  });

  afterAll(async () => {
    const db = await getDb();
    if (!db) return;

    // Limpar dados de teste
    for (const id of testRechargeIds) {
      await db.delete(recharges).where(eq(recharges.id, id));
    }
    await db.delete(customers).where(eq(customers.id, testCustomerId));
  });

  describe('getMyRecharges', () => {
    it('should list all recharges for a customer', async () => {
      const caller = appRouter.createCaller({
        user: null,
        req: {} as any,
        res: {} as any,
      });

      const result = await caller.recharges.getMyRecharges({
        customerId: testCustomerId,
        page: 1,
        limit: 20,
      });

      expect(result.data).toBeDefined();
      expect(result.data.length).toBeGreaterThanOrEqual(4);
      expect(result.pagination).toBeDefined();
      expect(result.pagination.total).toBeGreaterThanOrEqual(4);
    });

    it('should filter recharges by payment method', async () => {
      const caller = appRouter.createCaller({
        user: null,
        req: {} as any,
        res: {} as any,
      });

      const result = await caller.recharges.getMyRecharges({
        customerId: testCustomerId,
        page: 1,
        limit: 20,
        paymentMethod: 'pix',
      });

      expect(result.data).toBeDefined();
      expect(result.data.length).toBeGreaterThanOrEqual(2);
      result.data.forEach((recharge: any) => {
        expect(recharge.paymentMethod).toBe('pix');
      });
    });

    it('should filter recharges by status', async () => {
      const caller = appRouter.createCaller({
        user: null,
        req: {} as any,
        res: {} as any,
      });

      const result = await caller.recharges.getMyRecharges({
        customerId: testCustomerId,
        page: 1,
        limit: 20,
        status: 'completed',
      });

      expect(result.data).toBeDefined();
      expect(result.data.length).toBeGreaterThanOrEqual(2);
      result.data.forEach((recharge: any) => {
        expect(recharge.status).toBe('completed');
      });
    });

    it('should paginate results correctly', async () => {
      const caller = appRouter.createCaller({
        user: null,
        req: {} as any,
        res: {} as any,
      });

      const result = await caller.recharges.getMyRecharges({
        customerId: testCustomerId,
        page: 1,
        limit: 2,
      });

      expect(result.data).toBeDefined();
      expect(result.data.length).toBeLessThanOrEqual(2);
      expect(result.pagination.totalPages).toBeGreaterThanOrEqual(2);
    });

    it('should order recharges by creation date descending', async () => {
      const caller = appRouter.createCaller({
        user: null,
        req: {} as any,
        res: {} as any,
      });

      const result = await caller.recharges.getMyRecharges({
        customerId: testCustomerId,
        page: 1,
        limit: 20,
      });

      expect(result.data).toBeDefined();
      expect(result.data.length).toBeGreaterThan(0);

      // Verificar que está ordenado por data decrescente
      for (let i = 0; i < result.data.length - 1; i++) {
        const current = new Date(result.data[i].createdAt).getTime();
        const next = new Date(result.data[i + 1].createdAt).getTime();
        expect(current).toBeGreaterThanOrEqual(next);
      }
    });
  });

  describe('getRechargeById', () => {
    it('should get a specific recharge by id', async () => {
      const caller = appRouter.createCaller({
        user: null,
        req: {} as any,
        res: {} as any,
      });

      const result = await caller.recharges.getRechargeById({
        rechargeId: testRechargeIds[0],
        customerId: testCustomerId,
      });

      expect(result).toBeDefined();
      expect(result.id).toBe(testRechargeIds[0]);
      expect(result.customerId).toBe(testCustomerId);
    });

    it('should throw error when recharge not found', async () => {
      const caller = appRouter.createCaller({
        user: null,
        req: {} as any,
        res: {} as any,
      });

      await expect(
        caller.recharges.getRechargeById({
          rechargeId: 999999,
          customerId: testCustomerId,
        })
      ).rejects.toThrow('Recarga não encontrada');
    });

    it('should throw error when customer id does not match', async () => {
      const caller = appRouter.createCaller({
        user: null,
        req: {} as any,
        res: {} as any,
      });

      await expect(
        caller.recharges.getRechargeById({
          rechargeId: testRechargeIds[0],
          customerId: 999999,
        })
      ).rejects.toThrow('Recarga não encontrada');
    });
  });
});
