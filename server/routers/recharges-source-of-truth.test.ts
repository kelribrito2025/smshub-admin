import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { appRouter } from '../routers';
import { getDb } from '../db';
import { customers, recharges } from '../../drizzle/schema';
import { eq } from 'drizzle-orm';

describe('Recharges Router - Single Source of Truth', () => {
  let testCustomerId: number;
  let testRechargeIds: number[] = [];

  beforeAll(async () => {
    const db = await getDb();
    if (!db) throw new Error('Database connection failed');

    // Criar cliente de teste
    const customerResult = await db.insert(customers).values({
      name: 'Test Customer Recharges',
      email: `test-recharges-${Date.now()}@example.com`,
      pin: Math.floor(Math.random() * 1000000),
      password: 'hashed_password',
      balance: 0,
      active: true,
    });
    testCustomerId = Number(customerResult[0].insertId);

    // Criar recargas de diferentes métodos de pagamento
    const rechargeData = [
      { paymentMethod: 'pix', amount: 1000, status: 'completed', transactionId: 'pix_test_1' },
      { paymentMethod: 'pix', amount: 2000, status: 'completed', transactionId: 'pix_test_2' },
      { paymentMethod: 'card', amount: 3000, status: 'completed', transactionId: 'stripe_test_1' },
      { paymentMethod: 'crypto', amount: 5000, status: 'completed', transactionId: 'crypto_test_1' },
      { paymentMethod: 'picpay', amount: 1500, status: 'pending', transactionId: 'picpay_test_1' },
    ];

    for (const data of rechargeData) {
      const result = await db.insert(recharges).values({
        customerId: testCustomerId,
        amount: data.amount,
        paymentMethod: data.paymentMethod as any,
        status: data.status as any,
        transactionId: data.transactionId,
        completedAt: data.status === 'completed' ? new Date() : null,
      });
      testRechargeIds.push(Number(result[0].insertId));
    }
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
    it('should return all recharges from recharges table only', async () => {
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

      console.log('\n=== Recharges Source of Truth Test ===');
      console.log(`Total recharges: ${result.pagination.total}`);
      console.log('\nRecharges by payment method:');
      
      const byMethod = result.data.reduce((acc: any, r: any) => {
        acc[r.paymentMethod] = (acc[r.paymentMethod] || 0) + 1;
        return acc;
      }, {});
      
      Object.entries(byMethod).forEach(([method, count]) => {
        console.log(`  ${method}: ${count}`);
      });

      // Deve retornar exatamente 5 recargas (todas criadas no beforeAll)
      expect(result.pagination.total).toBe(5);
      expect(result.data.length).toBe(5);

      // Verificar que contém todos os métodos de pagamento
      const methods = result.data.map((r: any) => r.paymentMethod);
      expect(methods).toContain('pix');
      expect(methods).toContain('card');
      expect(methods).toContain('crypto');
      expect(methods).toContain('picpay');
    });

    it('should filter by payment method (pix)', async () => {
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

      console.log('\n=== PIX Filter Test ===');
      console.log(`Total PIX recharges: ${result.pagination.total}`);

      // Deve retornar apenas 2 recargas PIX
      expect(result.pagination.total).toBe(2);
      result.data.forEach((r: any) => {
        expect(r.paymentMethod).toBe('pix');
      });
    });

    it('should filter by status (completed)', async () => {
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

      console.log('\n=== Completed Status Filter Test ===');
      console.log(`Total completed recharges: ${result.pagination.total}`);

      // Deve retornar 4 recargas completas (excluindo a pendente)
      expect(result.pagination.total).toBe(4);
      result.data.forEach((r: any) => {
        expect(r.status).toBe('completed');
      });
    });

    it('should filter by status (pending)', async () => {
      const caller = appRouter.createCaller({
        user: null,
        req: {} as any,
        res: {} as any,
      });

      const result = await caller.recharges.getMyRecharges({
        customerId: testCustomerId,
        page: 1,
        limit: 20,
        status: 'pending',
      });

      console.log('\n=== Pending Status Filter Test ===');
      console.log(`Total pending recharges: ${result.pagination.total}`);

      // Deve retornar 1 recarga pendente
      expect(result.pagination.total).toBe(1);
      expect(result.data[0].status).toBe('pending');
      expect(result.data[0].paymentMethod).toBe('picpay');
    });

    it('should order by creation date (newest first)', async () => {
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

      console.log('\n=== Order Test ===');
      console.log('First recharge:', result.data[0].paymentMethod, new Date(result.data[0].createdAt).toISOString());
      console.log('Last recharge:', result.data[result.data.length - 1].paymentMethod, new Date(result.data[result.data.length - 1].createdAt).toISOString());

      // Verificar ordenação decrescente por data
      for (let i = 0; i < result.data.length - 1; i++) {
        const current = new Date(result.data[i].createdAt).getTime();
        const next = new Date(result.data[i + 1].createdAt).getTime();
        expect(current).toBeGreaterThanOrEqual(next);
      }
    });

    it('should paginate correctly', async () => {
      const caller = appRouter.createCaller({
        user: null,
        req: {} as any,
        res: {} as any,
      });

      // Página 1 com limite 2
      const page1 = await caller.recharges.getMyRecharges({
        customerId: testCustomerId,
        page: 1,
        limit: 2,
      });

      console.log('\n=== Pagination Test ===');
      console.log(`Page 1: ${page1.data.length} records`);
      console.log(`Total pages: ${page1.pagination.totalPages}`);

      expect(page1.data.length).toBe(2);
      expect(page1.pagination.totalPages).toBe(3); // 5 recargas / 2 por página = 3 páginas

      // Página 2
      const page2 = await caller.recharges.getMyRecharges({
        customerId: testCustomerId,
        page: 2,
        limit: 2,
      });

      console.log(`Page 2: ${page2.data.length} records`);
      expect(page2.data.length).toBe(2);

      // Página 3 (última)
      const page3 = await caller.recharges.getMyRecharges({
        customerId: testCustomerId,
        page: 3,
        limit: 2,
      });

      console.log(`Page 3: ${page3.data.length} records`);
      expect(page3.data.length).toBe(1); // Última página com apenas 1 registro
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

      console.log('\n=== Get Recharge By ID Test ===');
      console.log(`Recharge ID: ${result.id}`);
      console.log(`Amount: R$ ${(result.amount / 100).toFixed(2)}`);
      console.log(`Method: ${result.paymentMethod}`);

      expect(result.id).toBe(testRechargeIds[0]);
      expect(result.customerId).toBe(testCustomerId);
      expect(result.paymentMethod).toBe('pix');
    });

    it('should throw error for non-existent recharge', async () => {
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

    it('should throw error when accessing another customer recharge', async () => {
      const caller = appRouter.createCaller({
        user: null,
        req: {} as any,
        res: {} as any,
      });

      await expect(
        caller.recharges.getRechargeById({
          rechargeId: testRechargeIds[0],
          customerId: 999999, // Wrong customer ID
        })
      ).rejects.toThrow('Recarga não encontrada');
    });
  });
});
