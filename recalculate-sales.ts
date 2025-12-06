import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import * as schema from './drizzle/schema';
import { eq, sql } from 'drizzle-orm';

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL não encontrada');
  process.exit(1);
}

async function main() {
  const connection = await mysql.createConnection(DATABASE_URL);
  const db = drizzle(connection, { schema, mode: 'default' });

  console.log('🔄 Recalculando vendas de todos os serviços...');

  // Buscar contagem de ativações completadas por serviço
  const salesByService = await db
    .select({
      serviceId: schema.activations.serviceId,
      totalSales: sql<number>`COUNT(*)`.as('totalSales'),
    })
    .from(schema.activations)
    .where(eq(schema.activations.status, 'completed'))
    .groupBy(schema.activations.serviceId);

  console.log(`✅ Encontradas vendas para ${salesByService.length} serviços`);

  // Atualizar campo totalSales de cada serviço
  for (const sale of salesByService) {
    await db
      .update(schema.services)
      .set({ totalSales: sale.totalSales })
      .where(eq(schema.services.id, sale.serviceId));
    
    const service = await db
      .select()
      .from(schema.services)
      .where(eq(schema.services.id, sale.serviceId))
      .limit(1);
    
    if (service.length > 0) {
      console.log(`✅ ${service[0].name}: ${sale.totalSales} vendas`);
    }
  }

  console.log('\n✅ Recálculo concluído com sucesso!');
  await connection.end();
}

main().catch(console.error);
