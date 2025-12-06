import { describe, it, expect, beforeAll } from 'vitest';
import { appRouter } from '../routers';
import type { Context } from '../_core/context';
import { getDb } from '../db';
import { customers, balanceTransactions } from '../../drizzle/schema';
import { eq, desc } from 'drizzle-orm';

describe('Audit - Detecção de Inconsistências de Saldo', () => {
  let testCustomerId: number;
  let testCustomerWithInconsistency: number;

  // Mock context
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

    // Criar cliente de teste com saldo correto
    await db.insert(customers).values({
      pin: 9000 + Math.floor(Math.random() * 1000),
      name: 'Cliente Teste - Saldo Correto',
      email: `correto-${Date.now()}@test.com`,
      balance: 5000, // R$ 50,00
      active: true,
    });
    
    // Buscar o ID do cliente recém-criado
    const [customer1] = await db.select().from(customers)
      .where(eq(customers.name, 'Cliente Teste - Saldo Correto'))
      .orderBy(desc(customers.id))
      .limit(1);
    testCustomerId = customer1.id;

    // Criar transações que somam R$ 50,00
    await db.insert(balanceTransactions).values([
      {
        customerId: testCustomerId,
        type: 'credit',
        amount: 3000, // R$ 30,00
        description: 'Recarga inicial',
        balanceBefore: 0,
        balanceAfter: 3000,
        origin: 'admin',
      },
      {
        customerId: testCustomerId,
        type: 'credit',
        amount: 2000, // R$ 20,00
        description: 'Recarga adicional',
        balanceBefore: 3000,
        balanceAfter: 5000,
        origin: 'admin',
      },
    ]);

    // Criar cliente de teste com inconsistência
    await db.insert(customers).values({
      pin: 9000 + Math.floor(Math.random() * 1000),
      name: 'Cliente Teste - Saldo Inconsistente',
      email: `inconsistente-${Date.now()}@test.com`,
      balance: 10000, // R$ 100,00 (ERRADO!)
      active: true,
    });
    
    // Buscar o ID do cliente recém-criado
    const [customer2] = await db.select().from(customers)
      .where(eq(customers.name, 'Cliente Teste - Saldo Inconsistente'))
      .orderBy(desc(customers.id))
      .limit(1);
    testCustomerWithInconsistency = customer2.id;

    // Criar transações que somam apenas R$ 50,00
    await db.insert(balanceTransactions).values([
      {
        customerId: testCustomerWithInconsistency,
        type: 'credit',
        amount: 3000, // R$ 30,00
        description: 'Recarga inicial',
        balanceBefore: 0,
        balanceAfter: 3000,
        origin: 'admin',
      },
      {
        customerId: testCustomerWithInconsistency,
        type: 'credit',
        amount: 2000, // R$ 20,00
        description: 'Recarga adicional',
        balanceBefore: 3000,
        balanceAfter: 5000,
        origin: 'admin',
      },
      // Mas o saldo real está em R$ 100,00 - INCONSISTÊNCIA!
    ]);
  });

  it('deve detectar cliente com saldo correto (sem inconsistência)', async () => {
    const caller = createCaller();

    const result = await caller.audit.checkInconsistencies({
      customerId: testCustomerId,
    });

    expect(result.totalChecked).toBe(1);
    expect(result.totalInconsistent).toBe(0);
    expect(result.inconsistencies).toHaveLength(0);
  });

  it('deve detectar cliente com saldo maior que o esperado', async () => {
    const caller = createCaller();

    const result = await caller.audit.checkInconsistencies({
      customerId: testCustomerWithInconsistency,
    });

    expect(result.totalChecked).toBe(1);
    expect(result.totalInconsistent).toBe(1);
    expect(result.inconsistencies).toHaveLength(1);

    const inconsistency = result.inconsistencies[0];
    expect(inconsistency.customerId).toBe(testCustomerWithInconsistency);
    expect(inconsistency.actualBalance).toBe(10000); // R$ 100,00
    expect(inconsistency.expectedBalance).toBe(5000); // R$ 50,00
    expect(inconsistency.difference).toBe(5000); // +R$ 50,00
    expect(inconsistency.severity).toBe('high'); // > R$ 10,00 = crítico
  });

  it('deve calcular saldo esperado corretamente considerando créditos e débitos', async () => {
    const db = await getDb();
    if (!db) throw new Error('Database not available');

    // Criar cliente com transações mistas
    const customer = await db.insert(customers).values({
      pin: 9000 + Math.floor(Math.random() * 1000),
      name: 'Cliente Teste - Misto',
      email: `misto-${Date.now()}@test.com`,
      balance: 1500, // R$ 15,00 (correto: 50 - 20 - 15 = 15)
      active: true,
    });
    const customerId = Number(customer.insertId);

    await db.insert(balanceTransactions).values([
      {
        customerId,
        type: 'credit',
        amount: 5000, // +R$ 50,00
        description: 'Recarga',
        balanceBefore: 0,
        balanceAfter: 5000,
        origin: 'admin',
      },
      {
        customerId,
        type: 'debit',
        amount: -2000, // -R$ 20,00
        description: 'Compra',
        balanceBefore: 5000,
        balanceAfter: 3000,
        origin: 'system',
      },
      {
        customerId,
        type: 'debit',
        amount: -1500, // -R$ 15,00
        description: 'Compra',
        balanceBefore: 3000,
        balanceAfter: 1500,
        origin: 'system',
      },
    ]);

    const caller = createCaller();
    const result = await caller.audit.checkInconsistencies({ customerId });

    expect(result.totalInconsistent).toBe(0); // Saldo está correto
  });

  it('deve classificar severidade corretamente', async () => {
    const db = await getDb();
    if (!db) throw new Error('Database not available');

    // Criar clientes com diferentes níveis de inconsistência

    // 1. Baixa severidade (< R$ 1,00)
    const customer1 = await db.insert(customers).values({
      pin: 9000 + Math.floor(Math.random() * 1000),
      name: 'Cliente - Baixa Severidade',
      email: `baixa-${Date.now()}@test.com`,
      balance: 1050, // R$ 10,50
      active: true,
    });
    const customerId1 = Number(customer1.insertId);
    await db.insert(balanceTransactions).values({
      customerId: customerId1,
      type: 'credit',
      amount: 1000, // R$ 10,00
      description: 'Recarga',
      balanceBefore: 0,
      balanceAfter: 1000,
      origin: 'admin',
    });

    // 2. Média severidade (R$ 1,00 - R$ 10,00)
    const customer2 = await db.insert(customers).values({
      pin: 9000 + Math.floor(Math.random() * 1000),
      name: 'Cliente - Média Severidade',
      email: `media-${Date.now()}@test.com`,
      balance: 1500, // R$ 15,00
      active: true,
    });
    const customerId2 = Number(customer2.insertId);
    await db.insert(balanceTransactions).values({
      customerId: customerId2,
      type: 'credit',
      amount: 1000, // R$ 10,00
      description: 'Recarga',
      balanceBefore: 0,
      balanceAfter: 1000,
      origin: 'admin',
    });

    // 3. Alta severidade (> R$ 10,00)
    const customer3 = await db.insert(customers).values({
      pin: 9000 + Math.floor(Math.random() * 1000),
      name: 'Cliente - Alta Severidade',
      email: `alta-${Date.now()}@test.com`,
      balance: 5000, // R$ 50,00
      active: true,
    });
    const customerId3 = Number(customer3.insertId);
    await db.insert(balanceTransactions).values({
      customerId: customerId3,
      type: 'credit',
      amount: 1000, // R$ 10,00
      description: 'Recarga',
      balanceBefore: 0,
      balanceAfter: 1000,
      origin: 'admin',
    });

    const caller = createCaller();
    const result = await caller.audit.checkInconsistencies({});

    const baixa = result.inconsistencies.find((i: any) => i.customerId === customerId1);
    const media = result.inconsistencies.find((i: any) => i.customerId === customerId2);
    const alta = result.inconsistencies.find((i: any) => i.customerId === customerId3);

    expect(baixa?.severity).toBe('low'); // Diferença de R$ 0,50
    expect(media?.severity).toBe('medium'); // Diferença de R$ 5,00
    expect(alta?.severity).toBe('high'); // Diferença de R$ 40,00
  });

  it('deve verificar todos os clientes ativos quando customerId não é fornecido', async () => {
    const caller = createCaller();

    const result = await caller.audit.checkInconsistencies({});

    expect(result.totalChecked).toBeGreaterThan(0);
    // Deve incluir pelo menos o cliente com inconsistência criado no beforeAll
    expect(result.totalInconsistent).toBeGreaterThan(0);
  });

  it('deve ignorar clientes sem transações', async () => {
    const db = await getDb();
    if (!db) throw new Error('Database not available');

    // Criar cliente sem transações
    const customer = await db.insert(customers).values({
      pin: 9000 + Math.floor(Math.random() * 1000),
      name: 'Cliente Sem Transações',
      email: `semtransacoes-${Date.now()}@test.com`,
      balance: 0,
      active: true,
    });
    const customerId = Number(customer.insertId);

    const caller = createCaller();
    const result = await caller.audit.checkInconsistencies({ customerId });

    // Cliente sem transações não deve gerar inconsistência
    expect(result.totalInconsistent).toBe(0);
  });
});
