import { getDb } from '../server/db.js';
import { services, activations } from '../drizzle/schema.js';
import { eq, sql } from 'drizzle-orm';

/**
 * Script para recalcular totalSales de todos os serviços
 * baseando-se apenas em ativações com status 'completed'
 */

async function recalculateTotalSales() {
  console.log('🔄 Iniciando recálculo de totalSales...\n');
  
  const db = await getDb();
  if (!db) {
    console.error('❌ Erro: Banco de dados não disponível');
    process.exit(1);
  }

  try {
    // 1. Resetar todos os totalSales para 0
    console.log('📊 Resetando totalSales de todos os serviços para 0...');
    await db.update(services).set({ totalSales: 0 });
    console.log('✅ Reset concluído\n');

    // 2. Contar ativações concluídas por serviço
    console.log('📈 Contando ativações concluídas por serviço...');
    const salesByService = await db
      .select({
        serviceId: activations.serviceId,
        count: sql`COUNT(*)`.as('count'),
      })
      .from(activations)
      .where(eq(activations.status, 'completed'))
      .groupBy(activations.serviceId);

    console.log(`✅ Encontradas vendas para ${salesByService.length} serviços\n`);

    // 3. Atualizar totalSales de cada serviço
    console.log('🔄 Atualizando totalSales...');
    let updated = 0;
    for (const { serviceId, count } of salesByService) {
      if (serviceId) {
        await db
          .update(services)
          .set({ totalSales: Number(count) })
          .where(eq(services.id, serviceId));
        updated++;
        
        // Buscar nome do serviço para log
        const service = await db
          .select({ name: services.name })
          .from(services)
          .where(eq(services.id, serviceId))
          .limit(1);
        
        const serviceName = service[0]?.name || `ID ${serviceId}`;
        console.log(`  ✓ ${serviceName}: ${count} vendas`);
      }
    }

    console.log(`\n✅ Recálculo concluído! ${updated} serviços atualizados.`);
    console.log('\n📊 Resumo:');
    console.log(`   - Total de serviços com vendas: ${salesByService.length}`);
    console.log(`   - Total de vendas contabilizadas: ${salesByService.reduce((sum, s) => sum + Number(s.count), 0)}`);
    
  } catch (error) {
    console.error('❌ Erro durante recálculo:', error);
    process.exit(1);
  }
}

// Executar script
recalculateTotalSales()
  .then(() => {
    console.log('\n✨ Script finalizado com sucesso!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Erro fatal:', error);
    process.exit(1);
  });
