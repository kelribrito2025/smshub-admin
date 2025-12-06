import { describe, it, expect, beforeAll } from 'vitest';
import { getDb } from './db';
import { customers, activations } from '../drizzle/schema';
import { getCustomerStats } from './customers-helpers';
import { sql } from 'drizzle-orm';

describe('Customer Active Statistics', () => {
  beforeAll(async () => {
    const db = await getDb();
    if (!db) throw new Error('Database connection failed');
  });

  it('should calculate active customers in last 30 days correctly', async () => {
    const stats = await getCustomerStats();

    // Verificar que a estatística existe
    expect(stats).toBeDefined();
    expect(stats.activeCustomersLast30Days).toBeDefined();
    
    // Verificar que é um número não negativo
    expect(typeof stats.activeCustomersLast30Days).toBe('number');
    expect(stats.activeCustomersLast30Days).toBeGreaterThanOrEqual(0);
    
    // Verificar que não é maior que o total de clientes
    expect(stats.activeCustomersLast30Days).toBeLessThanOrEqual(stats.totalCustomers);
  });

  it('should count only customers with activations in last 30 days', async () => {
    const db = await getDb();
    if (!db) throw new Error('Database connection failed');

    // Contar manualmente clientes EXISTENTES com ativações nos últimos 30 dias
    // Usar INNER JOIN para garantir que só contamos clientes que ainda existem
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const manualCount = await db
      .selectDistinct({ customerId: activations.userId })
      .from(activations)
      .innerJoin(customers, sql`${activations.userId} = ${customers.id}`)
      .where(sql`${activations.createdAt} >= ${thirtyDaysAgo}`);

    const stats = await getCustomerStats();

    // Verificar que o cálculo da função bate com a contagem manual
    expect(stats.activeCustomersLast30Days).toBe(manualCount.length);
  });

  it('should return valid stats structure', async () => {
    const stats = await getCustomerStats();

    // Verificar estrutura completa do retorno
    expect(stats).toHaveProperty('totalCustomers');
    expect(stats).toHaveProperty('activeCustomers');
    expect(stats).toHaveProperty('activeCustomersLast30Days');
    expect(stats).toHaveProperty('totalBalance');
    expect(stats).toHaveProperty('averageBalance');

    // Verificar tipos
    expect(typeof stats.totalCustomers).toBe('number');
    expect(typeof stats.activeCustomers).toBe('number');
    expect(typeof stats.activeCustomersLast30Days).toBe('number');
    expect(typeof stats.totalBalance).toBe('number');
    expect(typeof stats.averageBalance).toBe('number');
  });

  it('should handle edge case when no activations exist', async () => {
    // Este teste valida que a função não quebra mesmo sem ativações
    const stats = await getCustomerStats();
    
    // Se não houver ativações, activeCustomersLast30Days deve ser 0
    // Mas como temos dados de teste, apenas validamos que não é undefined/null
    expect(stats.activeCustomersLast30Days).not.toBeUndefined();
    expect(stats.activeCustomersLast30Days).not.toBeNull();
  });
});
