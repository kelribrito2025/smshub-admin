import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { getDb } from './db';
import { createApi, updateApi, getApiById } from './apis-helpers';

describe('API Pricing Configuration', () => {
  let testApiId: number;

  beforeAll(async () => {
    // Criar API de teste
    const api = await createApi({
      name: 'Test API for Pricing',
      url: 'https://test-api.example.com',
      token: 'test-token-123',
      priority: 999,
      active: true,
      profitPercentage: 150, // 150%
      minimumPrice: 300, // R$ 3,00
    });
    testApiId = api.id;
  });

  afterAll(async () => {
    // Limpar API de teste
    const db = await getDb();
    if (db && testApiId) {
      await db.execute(`DELETE FROM sms_apis WHERE id = ${testApiId}`);
    }
  });

  it('deve criar API com configuração de preços', async () => {
    const api = await getApiById(testApiId);
    
    expect(api).toBeDefined();
    expect(api?.name).toBe('Test API for Pricing');
    expect(parseFloat(api?.profitPercentage || '0')).toBe(150);
    expect(api?.minimumPrice).toBe(300);
  });

  it('deve atualizar taxa de lucro da API', async () => {
    await updateApi(testApiId, {
      profitPercentage: 200, // Atualizar para 200%
    });

    const updated = await getApiById(testApiId);
    expect(parseFloat(updated?.profitPercentage || '0')).toBe(200);
    expect(updated?.minimumPrice).toBe(300); // Não deve alterar
  });

  it('deve atualizar preço mínimo da API', async () => {
    await updateApi(testApiId, {
      minimumPrice: 500, // Atualizar para R$ 5,00
    });

    const updated = await getApiById(testApiId);
    expect(updated?.minimumPrice).toBe(500);
    expect(parseFloat(updated?.profitPercentage || '0')).toBe(200); // Não deve alterar
  });

  it('deve aceitar taxa de lucro 0%', async () => {
    await updateApi(testApiId, {
      profitPercentage: 0,
    });

    const updated = await getApiById(testApiId);
    expect(parseFloat(updated?.profitPercentage || '0')).toBe(0);
  });

  it('deve aceitar preço mínimo 0', async () => {
    await updateApi(testApiId, {
      minimumPrice: 0,
    });

    const updated = await getApiById(testApiId);
    expect(updated?.minimumPrice).toBe(0);
  });

  it('deve armazenar profitPercentage como decimal com 2 casas', async () => {
    await updateApi(testApiId, {
      profitPercentage: 150.75,
    });

    const updated = await getApiById(testApiId);
    expect(updated?.profitPercentage).toBe('150.75');
  });
});
