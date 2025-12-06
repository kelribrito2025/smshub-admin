import { describe, it, expect } from 'vitest';
import { appRouter } from './routers';
import { getDb } from './db';
import { customers } from '../drizzle/schema';
import { eq } from 'drizzle-orm';

describe('Test xkelrix recharges query', () => {
  it('should return all 12 recharges for xkelrix@gmail.com', async () => {
    const db = await getDb();
    if (!db) throw new Error('Database not available');

    // Buscar cliente xkelrix
    const customerResult = await db
      .select()
      .from(customers)
      .where(eq(customers.email, 'xkelrix@gmail.com'))
      .limit(1);

    const customer = customerResult[0];
    console.log('Customer found:', {
      id: customer.id,
      email: customer.email,
      pin: customer.pin,
    });

    expect(customer).toBeDefined();
    expect(customer.email).toBe('xkelrix@gmail.com');

    // Criar caller
    const caller = appRouter.createCaller({
      user: null,
      req: {} as any,
      res: {} as any,
    });

    // Buscar recargas
    const result = await caller.recharges.getMyRecharges({
      customerId: customer.id,
      page: 1,
      limit: 20,
    });

    console.log('Query result:', {
      total: result.pagination.total,
      returned: result.data.length,
      totalPages: result.pagination.totalPages,
    });

    console.log('\nRecharges:');
    result.data.forEach((r, index) => {
      console.log(`${index + 1}. ID: ${r.id}, Amount: R$ ${(r.amount / 100).toFixed(2)}, Method: ${r.paymentMethod}, Status: ${r.status}`);
    });

    // Verificar se retornou 12 recargas
    expect(result.pagination.total).toBe(12);
    expect(result.data.length).toBe(12);

    // Verificar se existem recargas de R$ 2,33 (233 centavos)
    const recharges233 = result.data.filter((r: any) => r.amount === 233);
    console.log(`\nRecargas de R$ 2,33 encontradas: ${recharges233.length}`);
    expect(recharges233.length).toBeGreaterThan(0);
  });
});
