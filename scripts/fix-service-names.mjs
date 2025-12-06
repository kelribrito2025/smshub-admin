import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import { eq } from 'drizzle-orm';
import * as schema from '../drizzle/schema.js';
import { getServiceName } from '../shared/service-names.js';

const connection = await mysql.createConnection(process.env.DATABASE_URL);
const db = drizzle(connection, { schema, mode: 'default' });

console.log('🔧 Corrigindo nomes de serviços no banco de dados...\n');

// Get all services
const allServices = await db.query.services.findMany({
  orderBy: (services, { asc }) => [asc(services.smshubCode)]
});

let updated = 0;
let unchanged = 0;

for (const service of allServices) {
  const correctName = getServiceName(service.smshubCode);
  
  // Only update if the name is different
  if (service.name !== correctName) {
    console.log(`Atualizando: ${service.smshubCode.padEnd(15)} "${service.name}" → "${correctName}"`);
    
    await db.update(schema.services)
      .set({ name: correctName })
      .where(eq(schema.services.id, service.id));
    
    updated++;
  } else {
    unchanged++;
  }
}

console.log();
console.log(`✅ Atualização concluída:`);
console.log(`   Serviços atualizados: ${updated}`);
console.log(`   Serviços sem alteração: ${unchanged}`);
console.log(`   Total: ${allServices.length}`);

await connection.end();
