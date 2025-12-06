import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import * as schema from '../drizzle/schema';
import * as fs from 'fs';

const connection = await mysql.createConnection(process.env.DATABASE_URL!);
const db = drizzle(connection, { schema, mode: 'default' });

const allServices = await db.select({
  code: schema.services.smshubCode,
  name: schema.services.name
}).from(schema.services).orderBy(schema.services.smshubCode);

console.log(`Total services: ${allServices.length}\n`);

// Export to JSON
const output = allServices.map(s => ({
  code: s.code,
  currentName: s.name
}));

fs.writeFileSync(
  '/home/ubuntu/service-codes.json',
  JSON.stringify(output, null, 2)
);

console.log('Exported to /home/ubuntu/service-codes.json');

// Show first 50
console.log('\nFirst 50 services:');
allServices.slice(0, 50).forEach(s => {
  console.log(`${s.code.padEnd(15)} → ${s.name}`);
});

await connection.end();
