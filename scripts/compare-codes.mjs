import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import * as schema from '../drizzle/schema.js';
import { SERVICE_NAMES } from '../shared/service-names.js';

const connection = await mysql.createConnection(process.env.DATABASE_URL);
const db = drizzle(connection, { schema, mode: 'default' });

console.log('🔍 Comparando códigos do banco com documentação oficial...\n');

// Get all services from database
const dbServices = await db.query.services.findMany({
  orderBy: (services, { asc }) => [asc(services.smshubCode)]
});

const dbCodes = new Set(dbServices.map(s => s.smshubCode.toLowerCase()));
const docCodes = new Set(Object.keys(SERVICE_NAMES));

// Find codes in DB but not in documentation
const inDbNotInDoc = [];
for (const code of dbCodes) {
  if (!docCodes.has(code)) {
    const service = dbServices.find(s => s.smshubCode.toLowerCase() === code);
    inDbNotInDoc.push({ code, name: service.name });
  }
}

// Find codes in documentation but not in DB
const inDocNotInDb = [];
for (const code of docCodes) {
  if (!dbCodes.has(code)) {
    inDocNotInDb.push({ code, name: SERVICE_NAMES[code] });
  }
}

console.log(`📊 Estatísticas:`);
console.log(`   Códigos no banco: ${dbCodes.size}`);
console.log(`   Códigos na documentação: ${docCodes.size}`);
console.log(`   No banco mas não na doc: ${inDbNotInDoc.length}`);
console.log(`   Na doc mas não no banco: ${inDocNotInDb.length}`);
console.log();

if (inDbNotInDoc.length > 0) {
  console.log(`❌ Códigos no banco mas NÃO na documentação (${inDbNotInDoc.length}):`);
  console.log('─'.repeat(70));
  inDbNotInDoc.slice(0, 50).forEach((s, i) => {
    console.log(`${(i + 1).toString().padStart(3)}. ${s.code.padEnd(15)} → ${s.name}`);
  });
  if (inDbNotInDoc.length > 50) {
    console.log(`... e mais ${inDbNotInDoc.length - 50} códigos`);
  }
}

await connection.end();
