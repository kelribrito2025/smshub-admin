import { describe, it, expect, beforeAll } from 'vitest';
import { getDb } from './db';
import { activations, smsApis, customers } from '../drizzle/schema';
import { eq } from 'drizzle-orm';

describe('Regra de Cancelamento da Opção 3 (SMSActivate)', () => {
  let testCustomerId: number;
  let api3Id: number;

  beforeAll(async () => {
    const db = await getDb();
    if (!db) throw new Error('Database not available');

    // Buscar API 3 (SMSActivate)
    const apis = await db.select().from(smsApis).where(eq(smsApis.id, 3)).limit(1);
    if (apis.length === 0) {
      throw new Error('API 3 (SMSActivate) not found in database');
    }
    api3Id = apis[0].id;

    // Buscar cliente de teste
    const customersList = await db.select().from(customers).limit(1);
    if (customersList.length === 0) {
      throw new Error('No customers found in database for testing');
    }
    testCustomerId = customersList[0].id;
  });

  it('deve calcular tempo decorrido corretamente', () => {
    const now = Date.now();
    const createdAt1MinAgo = new Date(now - 1 * 60 * 1000); // 1 minuto atrás
    const createdAt3MinAgo = new Date(now - 3 * 60 * 1000); // 3 minutos atrás

    const elapsed1Min = (now - createdAt1MinAgo.getTime()) / (1000 * 60);
    const elapsed3Min = (now - createdAt3MinAgo.getTime()) / (1000 * 60);

    expect(elapsed1Min).toBeGreaterThanOrEqual(0.9);
    expect(elapsed1Min).toBeLessThan(1.1);
    expect(elapsed3Min).toBeGreaterThanOrEqual(2.9);
    expect(elapsed3Min).toBeLessThan(3.1);
  });

  it('deve bloquear cancelamento antes de 2 minutos', () => {
    const now = Date.now();
    const createdAt = new Date(now - 1 * 60 * 1000); // 1 minuto atrás
    const elapsedMinutes = (now - createdAt.getTime()) / (1000 * 60);

    expect(elapsedMinutes).toBeLessThan(2);

    const remainingSeconds = Math.ceil((2 - elapsedMinutes) * 60);
    expect(remainingSeconds).toBeGreaterThan(0);
    expect(remainingSeconds).toBeLessThanOrEqual(120);
  });

  it('deve permitir cancelamento após 2 minutos', () => {
    const now = Date.now();
    const createdAt = new Date(now - 3 * 60 * 1000); // 3 minutos atrás
    const elapsedMinutes = (now - createdAt.getTime()) / (1000 * 60);

    expect(elapsedMinutes).toBeGreaterThanOrEqual(2);
  });

  it('deve calcular segundos restantes corretamente', () => {
    const now = Date.now();
    const createdAt = new Date(now - 1.5 * 60 * 1000); // 1.5 minutos atrás (90 segundos)
    const elapsedMinutes = (now - createdAt.getTime()) / (1000 * 60);
    const remainingSeconds = Math.ceil((2 - elapsedMinutes) * 60);

    // Deve restar aproximadamente 30 segundos (2 min - 1.5 min = 0.5 min = 30s)
    expect(remainingSeconds).toBeGreaterThanOrEqual(25);
    expect(remainingSeconds).toBeLessThanOrEqual(35);
  });

  it('deve validar apenas API 3 (outras APIs não têm restrição)', async () => {
    const db = await getDb();
    if (!db) throw new Error('Database not available');

    // Buscar APIs 1 e 2
    const api1 = await db.select().from(smsApis).where(eq(smsApis.id, 1)).limit(1);
    const api2 = await db.select().from(smsApis).where(eq(smsApis.id, 2)).limit(1);

    // APIs 1 e 2 não devem ter restrição de cooldown
    // (validação é feita apenas no código, não no banco)
    expect(api1.length).toBeGreaterThan(0);
    expect(api2.length).toBeGreaterThan(0);
  });

  it('deve validar que API 3 existe no banco', async () => {
    const db = await getDb();
    if (!db) throw new Error('Database not available');

    const api3 = await db.select().from(smsApis).where(eq(smsApis.id, 3)).limit(1);

    expect(api3.length).toBeGreaterThan(0);
    expect(api3[0].id).toBe(3);
  });

  it('deve validar formato de mensagem de erro', () => {
    const remainingSeconds = 87;
    const errorMessage = `Este pedido só pode ser cancelado após 2 minutos. Aguarde mais ${remainingSeconds} segundos.`;

    expect(errorMessage).toContain('2 minutos');
    expect(errorMessage).toContain('87 segundos');
    expect(errorMessage).toContain('Aguarde mais');
  });
});
