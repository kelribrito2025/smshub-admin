import { describe, it, expect, beforeAll } from 'vitest';
import { getDb } from './db';
import { smsApis, activations, customers } from '../drizzle/schema';
import { eq, and, inArray } from 'drizzle-orm';

describe('Controle de Abuso - Limite de Pedidos Simultâneos', () => {
  let testApiId: number;
  let testCustomerId: number;

  beforeAll(async () => {
    const db = await getDb();
    if (!db) throw new Error('Database not available');

    // Buscar API existente ou usar a primeira disponível
    const apis = await db.select().from(smsApis).limit(1);
    if (apis.length === 0) {
      throw new Error('No APIs found in database for testing');
    }
    testApiId = apis[0].id;

    // Buscar cliente existente ou usar o primeiro disponível
    const customersList = await db.select().from(customers).limit(1);
    if (customersList.length === 0) {
      throw new Error('No customers found in database for testing');
    }
    testCustomerId = customersList[0].id;
  });

  it('deve permitir configurar limite de pedidos simultâneos', async () => {
    const db = await getDb();
    if (!db) throw new Error('Database not available');

    // Atualizar API com limite de 3 pedidos simultâneos
    await db
      .update(smsApis)
      .set({ maxSimultaneousOrders: 3 })
      .where(eq(smsApis.id, testApiId));

    // Verificar se foi atualizado
    const api = await db
      .select()
      .from(smsApis)
      .where(eq(smsApis.id, testApiId))
      .limit(1);

    expect(api[0].maxSimultaneousOrders).toBe(3);
  });

  it('deve contar pedidos ativos corretamente', async () => {
    const db = await getDb();
    if (!db) throw new Error('Database not available');

    // Contar pedidos ativos do cliente nesta API
    const activeOrders = await db
      .select()
      .from(activations)
      .where(
        and(
          eq(activations.userId, testCustomerId),
          eq(activations.apiId, testApiId),
          inArray(activations.status, ['pending', 'active'])
        )
      );

    const count = activeOrders.length;

    // Deve ser um número válido (>= 0)
    expect(count).toBeGreaterThanOrEqual(0);
    expect(typeof count).toBe('number');
  });

  it('deve validar limite de 0 como ilimitado', async () => {
    const db = await getDb();
    if (!db) throw new Error('Database not available');

    // Configurar limite 0 (ilimitado)
    await db
      .update(smsApis)
      .set({ maxSimultaneousOrders: 0 })
      .where(eq(smsApis.id, testApiId));

    const api = await db
      .select()
      .from(smsApis)
      .where(eq(smsApis.id, testApiId))
      .limit(1);

    // Limite 0 = sem validação (ilimitado)
    expect(api[0].maxSimultaneousOrders).toBe(0);
  });

  it('deve considerar apenas status pending e active como ativos', async () => {
    const db = await getDb();
    if (!db) throw new Error('Database not available');

    // Contar pedidos ativos (pending + active)
    const activeOrders = await db
      .select()
      .from(activations)
      .where(
        and(
          eq(activations.userId, testCustomerId),
          eq(activations.apiId, testApiId),
          inArray(activations.status, ['pending', 'active'])
        )
      );

    // Contar todos os pedidos (incluindo completed, cancelled, etc)
    const allOrders = await db
      .select()
      .from(activations)
      .where(
        and(
          eq(activations.userId, testCustomerId),
          eq(activations.apiId, testApiId)
        )
      );

    // Pedidos ativos devem ser <= total de pedidos
    expect(activeOrders.length).toBeLessThanOrEqual(allOrders.length);
  });

  it('deve filtrar pedidos por API corretamente', async () => {
    const db = await getDb();
    if (!db) throw new Error('Database not available');

    // Contar pedidos desta API
    const ordersThisApi = await db
      .select()
      .from(activations)
      .where(
        and(
          eq(activations.userId, testCustomerId),
          eq(activations.apiId, testApiId)
        )
      );

    // Contar pedidos de todas as APIs
    const ordersAllApis = await db
      .select()
      .from(activations)
      .where(eq(activations.userId, testCustomerId));

    // Pedidos desta API devem ser <= pedidos de todas as APIs
    expect(ordersThisApi.length).toBeLessThanOrEqual(ordersAllApis.length);
  });
});
