import { describe, it, expect, beforeAll } from 'vitest';
import { appRouter } from './routers';
import { getDb } from './db';
import { services, activations } from '../drizzle/schema';
import { eq, sql } from 'drizzle-orm';

describe('Ordenação Inteligente - Apenas Vendas Concluídas', () => {
  let adminContext: any;

  beforeAll(async () => {
    // Criar contexto de admin para testes
    adminContext = {
      user: { 
        id: 1, 
        email: 'admin@test.com', 
        role: 'admin',
        openId: 'test-admin',
        name: 'Admin Test'
      },
      req: {} as any,
      res: {} as any,
    };
  });

  it('deve recalcular totalSales baseado apenas em ativações concluídas', async () => {
    const caller = appRouter.createCaller(adminContext);
    
    // Executar recálculo
    const result = await caller.services.recalculateSales();
    
    expect(result.success).toBe(true);
    expect(result.servicesUpdated).toBeGreaterThanOrEqual(0);
    expect(result.totalSales).toBeGreaterThanOrEqual(0);
    
    console.log('✅ Recálculo executado:', result.message);
  });

  it('deve validar que totalSales corresponde apenas a ativações completed', async () => {
    const db = await getDb();
    if (!db) throw new Error('Database not available');

    // Buscar todos os serviços
    const allServices = await db.select().from(services);

    for (const service of allServices) {
      // Contar ativações completed para este serviço
      const completedCount = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(activations)
        .where(
          sql`${activations.serviceId} = ${service.id} AND ${activations.status} = 'completed'`
        );

      const expectedCount = Number(completedCount[0]?.count || 0);

      // Validar que totalSales corresponde
      expect(service.totalSales).toBe(expectedCount);
      
      if (service.totalSales > 0) {
        console.log(`✓ Serviço "${service.name}": ${service.totalSales} vendas (validado)`);
      }
    }
  });

  it('deve ordenar serviços por totalSales (top 20)', async () => {
    const db = await getDb();
    if (!db) throw new Error('Database not available');

    const top20 = await db
      .select()
      .from(services)
      .where(eq(services.active, true))
      .orderBy(sql`${services.totalSales} DESC`)
      .limit(20);

    // Verificar ordenação descendente
    for (let i = 0; i < top20.length - 1; i++) {
      expect(top20[i].totalSales).toBeGreaterThanOrEqual(top20[i + 1].totalSales);
    }

    console.log('✅ Top 20 serviços ordenados corretamente por vendas concluídas');
    console.log('Top 5:');
    top20.slice(0, 5).forEach((s, i) => {
      console.log(`  ${i + 1}. ${s.name}: ${s.totalSales} vendas`);
    });
  });

  it('NÃO deve incrementar totalSales ao criar ativação pendente', async () => {
    const db = await getDb();
    if (!db) throw new Error('Database not available');

    // Buscar um serviço qualquer
    const testService = await db
      .select()
      .from(services)
      .limit(1);

    if (testService.length === 0) {
      console.log('⚠️ Nenhum serviço disponível para teste');
      return;
    }

    const service = testService[0];
    const salesBefore = service.totalSales;

    // Criar ativação com status pending
    await db.insert(activations).values({
      userId: 1,
      serviceId: service.id,
      countryId: 1,
      phoneNumber: '+5511999999999',
      smshubActivationId: 'test-' + Date.now(),
      status: 'pending',
      costPrice: 100,
      sellingPrice: 150,
      profit: 50,
      createdAt: new Date(),
    });

    // Buscar serviço novamente
    const updatedService = await db
      .select()
      .from(services)
      .where(eq(services.id, service.id))
      .limit(1);

    // totalSales NÃO deve ter mudado
    expect(updatedService[0].totalSales).toBe(salesBefore);
    
    console.log(`✅ totalSales permaneceu ${salesBefore} após criar ativação pendente`);
  });
});
