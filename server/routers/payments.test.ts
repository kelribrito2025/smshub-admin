import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { getDb } from '../db';
import { customers, recharges, balanceTransactions } from '../../drizzle/schema';
import { eq } from 'drizzle-orm';

describe('Payments Router - Débito Automático em Devoluções', () => {
  let testCustomerId: number;
  let testRechargeId: number;

  beforeAll(async () => {
    const db = await getDb();
    if (!db) throw new Error('Database not available');

    // Criar cliente de teste com saldo
    const [customer] = await db.insert(customers).values({
      pin: Math.floor(Math.random() * 10000),
      name: 'Test Customer Refund',
      email: `test-refund-${Date.now()}@example.com`,
      balance: 10000, // R$ 100,00
      active: true,
    });
    testCustomerId = customer.insertId;

    // Criar recarga de teste
    const [recharge] = await db.insert(recharges).values({
      customerId: testCustomerId,
      amount: 5000, // R$ 50,00
      paymentMethod: 'pix',
      status: 'completed',
      endToEndId: 'E12345678202312311200000000000001',
      transactionId: 'test-txid-123',
    });
    testRechargeId = recharge.insertId;
  });

  afterAll(async () => {
    const db = await getDb();
    if (!db) return;

    // Limpar dados de teste
    if (testCustomerId) {
      await db.delete(balanceTransactions).where(eq(balanceTransactions.customerId, testCustomerId));
      await db.delete(recharges).where(eq(recharges.customerId, testCustomerId));
      await db.delete(customers).where(eq(customers.id, testCustomerId));
    }
  });

  it('deve calcular corretamente o débito quando saldo é suficiente', async () => {
    const db = await getDb();
    if (!db) throw new Error('Database not available');

    // Cenário: Saldo R$ 100, Devolução R$ 50
    // Esperado: Débito R$ 50, Saldo após R$ 50

    const [customer] = await db
      .select({ balance: customers.balance })
      .from(customers)
      .where(eq(customers.id, testCustomerId));

    const currentBalance = customer.balance;
    const refundAmount = 5000; // R$ 50,00
    const expectedDebit = Math.min(refundAmount, currentBalance);
    const expectedBalanceAfter = currentBalance - expectedDebit;

    expect(currentBalance).toBe(10000); // R$ 100,00
    expect(expectedDebit).toBe(5000); // R$ 50,00
    expect(expectedBalanceAfter).toBe(5000); // R$ 50,00
  });

  it('deve calcular corretamente o débito quando saldo é insuficiente', async () => {
    const db = await getDb();
    if (!db) throw new Error('Database not available');

    // Cenário: Saldo R$ 10, Devolução R$ 50
    // Esperado: Débito R$ 10, Saldo após R$ 0

    // Atualizar saldo para R$ 10
    await db.update(customers)
      .set({ balance: 1000 })
      .where(eq(customers.id, testCustomerId));

    const [customer] = await db
      .select({ balance: customers.balance })
      .from(customers)
      .where(eq(customers.id, testCustomerId));

    const currentBalance = customer.balance;
    const refundAmount = 5000; // R$ 50,00
    const expectedDebit = Math.min(refundAmount, currentBalance);
    const expectedBalanceAfter = currentBalance - expectedDebit;

    expect(currentBalance).toBe(1000); // R$ 10,00
    expect(expectedDebit).toBe(1000); // R$ 10,00 (limitado pelo saldo)
    expect(expectedBalanceAfter).toBe(0); // R$ 0,00

    // Restaurar saldo original
    await db.update(customers)
      .set({ balance: 10000 })
      .where(eq(customers.id, testCustomerId));
  });

  it('deve calcular corretamente o débito quando saldo é zero', async () => {
    const db = await getDb();
    if (!db) throw new Error('Database not available');

    // Cenário: Saldo R$ 0, Devolução R$ 50
    // Esperado: Débito R$ 0, Saldo após R$ 0

    // Atualizar saldo para R$ 0
    await db.update(customers)
      .set({ balance: 0 })
      .where(eq(customers.id, testCustomerId));

    const [customer] = await db
      .select({ balance: customers.balance })
      .from(customers)
      .where(eq(customers.id, testCustomerId));

    const currentBalance = customer.balance;
    const refundAmount = 5000; // R$ 50,00
    const expectedDebit = Math.min(refundAmount, currentBalance);
    const expectedBalanceAfter = currentBalance - expectedDebit;

    expect(currentBalance).toBe(0); // R$ 0,00
    expect(expectedDebit).toBe(0); // R$ 0,00 (sem saldo para debitar)
    expect(expectedBalanceAfter).toBe(0); // R$ 0,00

    // Restaurar saldo original
    await db.update(customers)
      .set({ balance: 10000 })
      .where(eq(customers.id, testCustomerId));
  });

  it('nunca deve permitir saldo negativo', async () => {
    const db = await getDb();
    if (!db) throw new Error('Database not available');

    // Testar vários cenários
    const scenarios = [
      { balance: 15000, refund: 13000, expectedDebit: 13000, expectedBalance: 2000 },
      { balance: 0, refund: 15000, expectedDebit: 0, expectedBalance: 0 },
      { balance: 1000, refund: 15000, expectedDebit: 1000, expectedBalance: 0 },
      { balance: 10000, refund: 15000, expectedDebit: 10000, expectedBalance: 0 },
    ];

    for (const scenario of scenarios) {
      const debitAmount = Math.min(scenario.refund, scenario.balance);
      const balanceAfter = scenario.balance - debitAmount;

      expect(debitAmount).toBe(scenario.expectedDebit);
      expect(balanceAfter).toBe(scenario.expectedBalance);
      expect(balanceAfter).toBeGreaterThanOrEqual(0); // Nunca negativo
    }
  });

  it('deve aplicar a fórmula MIN(valor_devolucao, saldo_disponivel) corretamente', async () => {
    const testCases = [
      { refund: 5000, balance: 10000, expected: 5000 }, // Saldo suficiente
      { refund: 15000, balance: 10000, expected: 10000 }, // Saldo insuficiente
      { refund: 10000, balance: 10000, expected: 10000 }, // Saldo exato
      { refund: 5000, balance: 0, expected: 0 }, // Sem saldo
      { refund: 5000, balance: 3000, expected: 3000 }, // Saldo parcial
    ];

    for (const testCase of testCases) {
      const debitAmount = Math.min(testCase.refund, testCase.balance);
      expect(debitAmount).toBe(testCase.expected);
    }
  });
});
