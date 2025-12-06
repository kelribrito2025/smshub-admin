import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { appRouter } from '../routers';
import { getDb } from '../db';
import { customers, services, countries, prices } from '../../drizzle/schema';
import { eq, and } from 'drizzle-orm';

describe('Store Router', () => {
  const caller = appRouter.createCaller({
    user: null,
    req: {} as any,
    res: {} as any,
  });

  let testCustomerId: number;
  let testServiceId: number;
  let testCountryId: number;

  beforeAll(async () => {
    const db = await getDb();
    if (!db) throw new Error('Database not available');

    // Limpar dados de teste anteriores
    await db.delete(customers).where(eq(customers.email, 'store-test@example.com'));

    // Buscar serviço ativo existente
    const existingServices = await db.select().from(services).where(eq(services.active, true)).limit(1);
    if (existingServices.length === 0) {
      throw new Error('No active services found in database');
    }
    testServiceId = existingServices[0].id;

    // Buscar país ativo existente
    const existingCountries = await db.select().from(countries).where(eq(countries.active, true)).limit(1);
    if (existingCountries.length === 0) {
      throw new Error('No active countries found in database');
    }
    testCountryId = existingCountries[0].id;

    // Verificar se existe preço para essa combinação
    const existingPrice = await db.select().from(prices)
      .where(and(
        eq(prices.countryId, testCountryId),
        eq(prices.serviceId, testServiceId)
      ))
      .limit(1);

    if (existingPrice.length === 0) {
      // Criar preço de teste se não existir
      await db.insert(prices).values({
        countryId: testCountryId,
        serviceId: testServiceId,
        smshubPrice: 100, // R$ 1.00
        ourPrice: 150, // R$ 1.50
        quantityAvailable: 10,
      });
    }
  });

  afterAll(async () => {
    const db = await getDb();
    if (!db) return;

    // Limpar apenas o cliente de teste
    if (testCustomerId) {
      await db.delete(customers).where(eq(customers.id, testCustomerId));
    }
  });

  describe('Customer Authentication', () => {
    it('should register a new customer', async () => {
      const result = await caller.store.register({
        email: 'store-test@example.com',
        name: 'Store Test User',
      });

      expect(result).toBeDefined();
      expect(result.email).toBe('store-test@example.com');
      expect(result.name).toBe('Store Test User');
      expect(result.pin).toBeGreaterThan(0);
      expect(result.balance).toBe(0);

      testCustomerId = result.id;
    });

    it('should return existing customer on duplicate registration', async () => {
      const result = await caller.store.register({
        email: 'store-test@example.com',
        name: 'Store Test User',
      });

      expect(result.id).toBe(testCustomerId);
      expect(result.email).toBe('store-test@example.com');
    });

    it('should login existing customer', async () => {
      const result = await caller.store.login({
        email: 'store-test@example.com',
      });

      expect(result).toBeDefined();
      expect(result.id).toBe(testCustomerId);
      expect(result.email).toBe('store-test@example.com');
    });

    it('should throw error for non-existent customer', async () => {
      await expect(
        caller.store.login({
          email: 'nonexistent@example.com',
        })
      ).rejects.toThrow('Cliente não encontrado');
    });
  });

  describe('Customer Data', () => {
    it('should get customer by ID', async () => {
      const result = await caller.store.getCustomer({
        customerId: testCustomerId,
      });

      expect(result).toBeDefined();
      expect(result.id).toBe(testCustomerId);
      expect(result.email).toBe('store-test@example.com');
    });

    it('should throw error for invalid customer ID', async () => {
      await expect(
        caller.store.getCustomer({
          customerId: 999999,
        })
      ).rejects.toThrow('Cliente não encontrado');
    });
  });

  describe('Services and Countries', () => {
    it('should list active services', async () => {
      const result = await caller.store.getServices();

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
      
      const testService = result.find(s => s.id === testServiceId);
      expect(testService).toBeDefined();
      expect(testService?.active).toBe(true);
    });

    it('should list active countries', async () => {
      const result = await caller.store.getCountries();

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
      
      const testCountry = result.find(c => c.id === testCountryId);
      expect(testCountry).toBeDefined();
      expect(testCountry?.active).toBe(true);
    });
  });

  describe('Prices', () => {
    it('should get price for specific country and service', async () => {
      const result = await caller.store.getPrices({
        countryId: testCountryId,
        serviceId: testServiceId,
      });

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(1);
      expect(result[0].price.smshubPrice).toBeGreaterThan(0);
      expect(result[0].price.ourPrice).toBeGreaterThan(0);
    });

    it('should return empty array for non-existent combination', async () => {
      const result = await caller.store.getPrices({
        countryId: 999999,
        serviceId: 999999,
      });

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(0);
    });
  });

  describe('Purchase Flow', () => {
    it('should reject purchase with insufficient balance', async () => {
      await expect(
        caller.store.purchaseNumber({
          customerId: testCustomerId,
          countryId: testCountryId,
          serviceId: testServiceId,
        })
      ).rejects.toThrow('Saldo insuficiente');
    });

    it('should reject purchase for non-existent price', async () => {
      await expect(
        caller.store.purchaseNumber({
          customerId: testCustomerId,
          countryId: 999999,
          serviceId: 999999,
        })
      ).rejects.toThrow('Preço não encontrado');
    });

    it('should reject purchase for non-existent customer', async () => {
      await expect(
        caller.store.purchaseNumber({
          customerId: 999999,
          countryId: testCountryId,
          serviceId: testServiceId,
        })
      ).rejects.toThrow('Cliente não encontrado');
    });
  });

  describe('Activations', () => {
    it('should return empty array for customer with no activations', async () => {
      const result = await caller.store.getMyActivations({
        customerId: testCustomerId,
      });

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(0);
    });

    it('should throw error for non-existent activation', async () => {
      await expect(
        caller.store.getActivation({
          activationId: 999999,
          customerId: testCustomerId,
        })
      ).rejects.toThrow('Ativação não encontrada');
    });
  });
});
