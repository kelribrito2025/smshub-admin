import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { appRouter } from '../routers';
import type { Context } from '../_core/context';
import { getDb } from '../db';
import { customers, activations, balanceTransactions } from '../../drizzle/schema';
import { eq } from 'drizzle-orm';

describe('Store - Expiration & Auto-Refund System', () => {
  let testCustomerId: number;
  let testActivationId: number;
  const initialBalance = 10000; // R$ 100.00
  const activationPrice = 200; // R$ 2.00

  // Mock context (sem autenticação necessária para testes de API pública)
  const createCaller = () => {
    const mockContext: Context = {
      req: {} as any,
      res: {} as any,
      user: null,
    };
    return appRouter.createCaller(mockContext);
  };

  beforeAll(async () => {
    const db = await getDb();
    if (!db) throw new Error('Database not available');

    // Criar cliente de teste
    const customerResult = await db.insert(customers).values({
      name: 'Test Customer - Expiration',
      email: `test-expiration-${Date.now()}@example.com`,
      balance: initialBalance,
      active: true,
      pin: Math.floor(Math.random() * 1000000),
    });

    testCustomerId = Number(customerResult[0].insertId);

    // Criar ativação de teste com data antiga (> 20 minutos)
    const twentyOneMinutesAgo = new Date(Date.now() - 21 * 60 * 1000);
    
    const activationResult = await db.insert(activations).values({
      userId: testCustomerId,
      serviceId: 1,
      countryId: 1,
      apiId: 1,
      smshubActivationId: 'test-activation-expired',
      phoneNumber: '+5511999999999',
      status: 'active', // Ainda marcado como ativo
      smshubStatus: 'waiting', // Status da API = aguardando
      sellingPrice: activationPrice,
      smshubCost: 150,
      profit: 50,
      createdAt: twentyOneMinutesAgo, // Criado há 21 minutos
    });

    testActivationId = Number(activationResult[0].insertId);

    console.log(`[TEST] Created test customer ${testCustomerId} with balance R$ ${initialBalance / 100}`);
    console.log(`[TEST] Created test activation ${testActivationId} (21 minutes old, status=active)`);
  });

  afterAll(async () => {
    const db = await getDb();
    if (!db) return;

    // Limpar dados de teste
    await db.delete(balanceTransactions).where(eq(balanceTransactions.customerId, testCustomerId));
    await db.delete(activations).where(eq(activations.id, testActivationId));
    await db.delete(customers).where(eq(customers.id, testCustomerId));

    console.log('[TEST] Cleanup completed');
  });

  it('should NOT auto-expire activation if status is not "waiting"', async () => {
    const db = await getDb();
    if (!db) throw new Error('Database not available');

    // Mudar status para 'received' (não deve expirar)
    await db.update(activations)
      .set({ smshubStatus: 'received', smsCode: '123456' })
      .where(eq(activations.id, testActivationId));

    const caller = createCaller();
    
    // Chamar getMyActivations (que faz o polling e detecta expirações)
    const result = await caller.store.getMyActivations({ customerId: testCustomerId });

    // Verificar que ativação NÃO foi expirada (tem código SMS)
    const activation = await db.select().from(activations).where(eq(activations.id, testActivationId)).limit(1);
    expect(activation[0].status).not.toBe('expired');

    // Restaurar status para teste seguinte
    await db.update(activations)
      .set({ smshubStatus: 'waiting', smsCode: null })
      .where(eq(activations.id, testActivationId));
  });

  it('should detect expired activation and process auto-refund', async () => {
    const db = await getDb();
    if (!db) throw new Error('Database not available');

    // Verificar saldo inicial
    const customerBefore = await db.select().from(customers).where(eq(customers.id, testCustomerId)).limit(1);
    const balanceBefore = customerBefore[0].balance;
    
    console.log(`[TEST] Customer balance BEFORE: R$ ${balanceBefore / 100}`);
    expect(balanceBefore).toBe(initialBalance);

    const caller = createCaller();
    
    // Chamar getMyActivations (que faz o polling e detecta expirações)
    // NOTA: Este teste assume que a API SMSHub retorna status 'waiting'
    // Em produção, o polling real chamaria a API externa
    const result = await caller.store.getMyActivations({ customerId: testCustomerId });

    // Verificar que ativação foi marcada como expirada
    const activation = await db.select().from(activations).where(eq(activations.id, testActivationId)).limit(1);
    expect(activation[0].status).toBe('expired');
    console.log(`[TEST] Activation status changed to: ${activation[0].status}`);

    // Verificar que reembolso foi processado
    const customerAfter = await db.select().from(customers).where(eq(customers.id, testCustomerId)).limit(1);
    const balanceAfter = customerAfter[0].balance;
    
    console.log(`[TEST] Customer balance AFTER: R$ ${balanceAfter / 100}`);
    expect(balanceAfter).toBe(balanceBefore + activationPrice);

    // Verificar que transação de reembolso foi criada
    const transactions = await db.select()
      .from(balanceTransactions)
      .where(eq(balanceTransactions.customerId, testCustomerId))
      .limit(10);

    const refundTransaction = transactions.find(t => t.type === 'refund' && t.relatedActivationId === testActivationId);
    expect(refundTransaction).toBeDefined();
    expect(refundTransaction?.amount).toBe(activationPrice);
    expect(refundTransaction?.balanceBefore).toBe(balanceBefore);
    expect(refundTransaction?.balanceAfter).toBe(balanceAfter);
    
    console.log(`[TEST] Refund transaction created: R$ ${refundTransaction?.amount! / 100}`);
  });

  it('should show expired activation in history, not in active list', async () => {
    const caller = createCaller();

    // Verificar que ativação expirada NÃO aparece em getMyActivations
    const activeList = await caller.store.getMyActivations({ customerId: testCustomerId });
    const foundInActive = activeList.some((a: any) => a.id === testActivationId);
    expect(foundInActive).toBe(false);
    console.log('[TEST] Expired activation NOT in active list ✓');

    // Verificar que ativação expirada APARECE em getMyHistory
    const historyResult = await caller.store.getMyHistory({ 
      customerId: testCustomerId, 
      page: 1, 
      limit: 20 
    });
    const foundInHistory = historyResult.data.some((a: any) => a.id === testActivationId);
    expect(foundInHistory).toBe(true);
    
    const expiredActivation = historyResult.data.find((a: any) => a.id === testActivationId);
    expect(expiredActivation?.status).toBe('expired');
    console.log('[TEST] Expired activation found in history with correct status ✓');
  });
});
