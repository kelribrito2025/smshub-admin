import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import * as schema from '../drizzle/schema.js';

const connection = await mysql.createConnection(process.env.DATABASE_URL);
const db = drizzle(connection, { schema, mode: 'default' });

console.log('🔍 Procurando serviços sem mapeamento...\n');

// Get all services
const allServices = await db.query.services.findMany({
  orderBy: (services, { asc }) => [asc(services.smshubCode)]
});

// Import service names mapping
const { SERVICE_NAMES } = await import('../shared/service-names.js');

const unmapped = [];

for (const service of allServices) {
  const mapped = SERVICE_NAMES[service.smshubCode.toLowerCase()];
  if (!mapped || mapped === service.smshubCode.toUpperCase()) {
    unmapped.push({
      code: service.smshubCode,
      name: service.name
    });
  }
}

console.log(`📊 Total de serviços: ${allServices.length}`);
console.log(`❌ Serviços sem mapeamento: ${unmapped.length}\n`);

if (unmapped.length > 0) {
  console.log('Códigos sem mapeamento:');
  console.log('─'.repeat(60));
  unmapped.forEach((s, i) => {
    console.log(`${(i + 1).toString().padStart(3)}. ${s.code.padEnd(10)} → ${s.name}`);
  });
}

await connection.end();
