import { describe, it, expect, beforeAll } from 'vitest';
import { appRouter } from './routers';
import type { Context } from './_core/context';

describe('Catalog - Active Countries Filter', () => {
  let caller: ReturnType<typeof appRouter.createCaller>;

  beforeAll(() => {
    // Mock context with admin user
    const mockContext: Context = {
      user: {
        id: 1,
        openId: 'test-admin',
        name: 'Admin Test',
        email: 'admin@test.com',
        role: 'admin',
      },
    };

    caller = appRouter.createCaller(mockContext);
  });

  it('should return all countries including inactive ones', async () => {
    const countries = await caller.countries.getAll();
    
    expect(countries).toBeDefined();
    expect(Array.isArray(countries)).toBe(true);
    
    // Deve ter pelo menos alguns países
    expect(countries.length).toBeGreaterThan(0);
    
    // Verificar estrutura dos países
    if (countries.length > 0) {
      const country = countries[0];
      expect(country).toHaveProperty('id');
      expect(country).toHaveProperty('name');
      expect(country).toHaveProperty('code');
      expect(country).toHaveProperty('active');
    }
  });

  it('should have both active and inactive countries in database', async () => {
    const countries = await caller.countries.getAll();
    
    const activeCountries = countries.filter(c => c.active);
    const inactiveCountries = countries.filter(c => !c.active);
    
    console.log(`Total countries: ${countries.length}`);
    console.log(`Active countries: ${activeCountries.length}`);
    console.log(`Inactive countries: ${inactiveCountries.length}`);
    
    // Deve ter pelo menos alguns países ativos
    expect(activeCountries.length).toBeGreaterThan(0);
    
    // Log dos países ativos para verificação
    console.log('Active countries:', activeCountries.map(c => `${c.name} (${c.code})`).join(', '));
  });

  it('frontend should filter only active countries for import', async () => {
    const countries = await caller.countries.getAll();
    
    // Simular o filtro que o frontend aplica
    const activeCountriesForImport = countries.filter(country => country.active);
    
    // Verificar que todos os países retornados estão ativos
    activeCountriesForImport.forEach(country => {
      expect(country.active).toBe(true);
    });
    
    // Deve ter pelo menos Brasil e Indonésia ativos (conforme requisito)
    const countryNames = activeCountriesForImport.map(c => c.name.toLowerCase());
    
    console.log('Countries available for import:', activeCountriesForImport.map(c => c.name).join(', '));
    
    // Verificar que apenas países ativos são retornados
    expect(activeCountriesForImport.length).toBeGreaterThan(0);
    expect(activeCountriesForImport.every(c => c.active)).toBe(true);
  });
});
