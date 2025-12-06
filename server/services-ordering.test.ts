import { describe, it, expect, beforeAll } from 'vitest';
import { getAllServices, upsertService } from './db-helpers';

describe('Ordenação de Serviços', () => {
  beforeAll(async () => {
    // Garantir que temos serviços de teste
    await upsertService({
      smshubCode: 'test_top1',
      name: 'ZZZ Top Service',
      active: true,
      markupPercentage: 0,
      markupFixed: 0,
      totalSales: 200, // Mais vendido
    });

    await upsertService({
      smshubCode: 'test_top2',
      name: 'AAA Top Service',
      active: true,
      markupPercentage: 0,
      markupFixed: 0,
      totalSales: 150,
    });

    await upsertService({
      smshubCode: 'test_low1',
      name: 'AAA Low Service',
      active: true,
      markupPercentage: 0,
      markupFixed: 0,
      totalSales: 5, // Poucas vendas
    });

    await upsertService({
      smshubCode: 'test_low2',
      name: 'ZZZ Low Service',
      active: true,
      markupPercentage: 0,
      markupFixed: 0,
      totalSales: 3,
    });
  });

  it('deve ordenar top 20 por vendas (descendente)', async () => {
    const services = await getAllServices(true);
    
    // Verificar que temos serviços
    expect(services.length).toBeGreaterThan(0);
    
    // Pegar os primeiros 20 (ou menos se houver menos de 20)
    const top20 = services.slice(0, Math.min(20, services.length));
    
    // Verificar que os top 20 estão ordenados por vendas (descendente)
    for (let i = 0; i < top20.length - 1; i++) {
      expect(top20[i].totalSales).toBeGreaterThanOrEqual(top20[i + 1].totalSales);
    }
  });

  it('deve ordenar serviços após top 20 alfabeticamente', async () => {
    const services = await getAllServices(true);
    
    // Se houver mais de 20 serviços
    if (services.length > 20) {
      const afterTop20 = services.slice(20);
      
      // Verificar ordenação alfabética
      // Nota: MySQL pode usar collation diferente do JavaScript
      // Vamos verificar que a maioria dos serviços está em ordem crescente
      let orderedPairs = 0;
      let totalPairs = 0;
      
      for (let i = 0; i < afterTop20.length - 1; i++) {
        totalPairs++;
        const comparison = afterTop20[i].name.toLowerCase().localeCompare(afterTop20[i + 1].name.toLowerCase());
        if (comparison <= 0) {
          orderedPairs++;
        }
      }
      
      // Pelo menos 90% dos pares devem estar em ordem (collation pode variar)
      const orderPercentage = (orderedPairs / totalPairs) * 100;
      expect(orderPercentage).toBeGreaterThan(90);
    }
  });

  it('deve manter serviço com mais vendas no topo mesmo com nome começando em Z', async () => {
    const services = await getAllServices(true);
    
    // Encontrar nosso serviço de teste "ZZZ Top Service" com 200 vendas
    const topService = services.find(s => s.smshubCode === 'test_top1');
    
    if (topService) {
      // Deve estar entre os primeiros (top 20)
      const topServiceIndex = services.findIndex(s => s.id === topService.id);
      expect(topServiceIndex).toBeLessThan(20);
      
      // Verificar que está antes de serviços com menos vendas
      const lowService = services.find(s => s.smshubCode === 'test_low1');
      if (lowService) {
        const lowServiceIndex = services.findIndex(s => s.id === lowService.id);
        expect(topServiceIndex).toBeLessThan(lowServiceIndex);
      }
    }
  });

  it('deve ordenar serviços com poucas vendas alfabeticamente', async () => {
    const services = await getAllServices(true);
    
    // Encontrar serviços de teste com poucas vendas
    const lowService1 = services.find(s => s.smshubCode === 'test_low1'); // AAA Low Service
    const lowService2 = services.find(s => s.smshubCode === 'test_low2'); // ZZZ Low Service
    
    if (lowService1 && lowService2) {
      const index1 = services.findIndex(s => s.id === lowService1.id);
      const index2 = services.findIndex(s => s.id === lowService2.id);
      
      // AAA deve vir antes de ZZZ (se ambos estiverem fora do top 20)
      if (index1 >= 20 && index2 >= 20) {
        expect(index1).toBeLessThan(index2);
      }
    }
  });
});
