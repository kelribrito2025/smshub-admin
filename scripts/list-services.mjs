import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import { services } from '../drizzle/schema.js';

const connection = await mysql.createConnection(process.env.DATABASE_URL);
const db = drizzle(connection);

const allServices = await db.select({
  code: services.smshubCode,
  name: services.name
}).from(services).orderBy(services.name);

console.log('Total services:', allServices.length);
console.log('\nServices:');
allServices.forEach(s => {
  console.log(`${s.code.padEnd(10)} → ${s.name}`);
});

await connection.end();
