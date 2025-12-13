import { describe, it, expect, beforeAll } from 'vitest';
import { addBalance } from './customers-helpers';
import { getDb } from './db';
import { customers, balanceTransactions } from '../drizzle/schema';
import { eq, desc } from 'drizzle-orm';

describe('Transaction Origin Tests', () => {
  let testCustomerId: number;

  beforeAll(async () => {
    const db = await getDb();
    if (!db) throw new Error('Database not available');

    // Usar primeiro cliente existente no banco
    const [customer] = await db.select().from(customers).limit(1);
    
    if (!customer) {
      throw new Error('No customers found in database. Please create at least one customer first.');
    }

    testCustomerId = customer.id;
    console.log(`[Test] Using customer ID ${testCustomerId} for tests`);
  });

  it('should create purchase transaction with customer origin', async () => {
    const db = await getDb();
    if (!db) throw new Error('Database not available');

    // Criar transação de compra (origem: customer)
    await addBalance(
      testCustomerId,
      -100, // R$ 1.00
      'purchase',
      'Teste: Compra de número SMS',
      undefined, // createdBy
      undefined, // relatedActivationId
      'customer' // origin
    );

    // Verificar transação criada
    const [transaction] = await db
      .select()
      .from(balanceTransactions)
      .where(eq(balanceTransactions.customerId, testCustomerId))
      .orderBy(desc(balanceTransactions.id))
      .limit(1);

    expect(transaction).toBeDefined();
    expect(transaction.type).toBe('purchase');
    expect(transaction.origin).toBe('customer');
    expect(transaction.description).toContain('Teste');
  });

  it('should create refund transaction with customer origin', async () => {
    const db = await getDb();
    if (!db) throw new Error('Database not available');

    // Criar transação de reembolso (origem: customer)
    await addBalance(
      testCustomerId,
      100, // R$ 1.00
      'refund',
      'Teste: Reembolso de ativação cancelada',
      undefined, // createdBy
      undefined, // relatedActivationId
      'customer' // origin
    );

    // Verificar transação criada
    const [transaction] = await db
      .select()
      .from(balanceTransactions)
      .where(eq(balanceTransactions.customerId, testCustomerId))
      .orderBy(desc(balanceTransactions.id))
      .limit(1);

    expect(transaction).toBeDefined();
    expect(transaction.type).toBe('refund');
    expect(transaction.origin).toBe('customer');
    expect(transaction.description).toContain('Teste');
  });

  it('should create credit transaction with customer origin (recharge)', async () => {
    const db = await getDb();
    if (!db) throw new Error('Database not available');

    // Criar transação de recarga (origem: customer)
    await addBalance(
      testCustomerId,
      500, // R$ 5.00
      'credit',
      'Teste: Recarga via PIX',
      undefined, // createdBy
      undefined, // relatedActivationId
      'customer' // origin
    );

    // Verificar transação criada
    const [transaction] = await db
      .select()
      .from(balanceTransactions)
      .where(eq(balanceTransactions.customerId, testCustomerId))
      .orderBy(desc(balanceTransactions.id))
      .limit(1);

    expect(transaction).toBeDefined();
    expect(transaction.type).toBe('credit');
    expect(transaction.origin).toBe('customer');
    expect(transaction.description).toContain('Teste');
  });

  it('should default to system origin when no origin is provided', async () => {
    const db = await getDb();
    if (!db) throw new Error('Database not available');

    // Criar transação sem especificar origem (deve usar default: system)
    await addBalance(
      testCustomerId,
      50, // R$ 0.50
      'credit',
      'Teste: Crédito automático do sistema'
      // Sem createdBy e sem origin -> deve ser 'system'
    );

    // Verificar transação criada
    const [transaction] = await db
      .select()
      .from(balanceTransactions)
      .where(eq(balanceTransactions.customerId, testCustomerId))
      .orderBy(desc(balanceTransactions.id))
      .limit(1);

    expect(transaction).toBeDefined();
    expect(transaction.type).toBe('credit');
    expect(transaction.origin).toBe('system');
    expect(transaction.description).toContain('Teste');
  });

  it('should use admin origin when createdBy is provided', async () => {
    const db = await getDb();
    if (!db) throw new Error('Database not available');

    // Criar transação com createdBy (admin)
    await addBalance(
      testCustomerId,
      100, // R$ 1.00
      'credit',
      'Teste: Crédito manual do admin',
      1 // createdBy (admin user ID)
    );

    // Verificar transação criada
    const [transaction] = await db
      .select()
      .from(balanceTransactions)
      .where(eq(balanceTransactions.customerId, testCustomerId))
      .orderBy(desc(balanceTransactions.id))
      .limit(1);

    expect(transaction).toBeDefined();
    expect(transaction.type).toBe('credit');
    expect(transaction.origin).toBe('admin');
    expect(transaction.description).toContain('Teste');
  });
});
