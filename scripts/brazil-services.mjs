import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import { eq, and, sql } from 'drizzle-orm';
import * as schema from '../drizzle/schema.js';

const connection = await mysql.createConnection(process.env.DATABASE_URL);
const db = drizzle(connection, { schema, mode: 'default' });

console.log('🔍 Investigando serviços disponíveis para Brasil...\n');

// Get Brazil country
const brazil = await db.query.countries.findFirst({
  where: eq(schema.countries.code, 'brazil')
});

if (!brazil) {
  console.log('❌ País Brasil não encontrado no banco de dados');
  process.exit(1);
}

console.log(`✅ País encontrado: ${brazil.name} (ID: ${brazil.id}, Code: ${brazil.code})`);
console.log(`   SMSHub ID: ${brazil.smshubId}`);
console.log(`   Markup: ${brazil.markupPercentage}% + R$ ${(brazil.markupFixed / 100).toFixed(2)}`);
console.log();

// Count total services in database
const totalServicesResult = await db.execute(
  sql`SELECT COUNT(*) as count FROM services`
);
const totalServices = totalServicesResult[0][0].count;

// Count services with prices for Brazil
const brazilServicesResult = await db.execute(
  sql`SELECT COUNT(DISTINCT serviceId) as count 
      FROM prices 
      WHERE countryId = ${brazil.id}`
);
const brazilServices = brazilServicesResult[0][0].count;

// Count total prices for Brazil
const brazilPricesResult = await db.execute(
  sql`SELECT COUNT(*) as count 
      FROM prices 
      WHERE countryId = ${brazil.id}`
);
const brazilPrices = brazilPricesResult[0][0].count;

console.log('📊 Estatísticas:');
console.log(`   Total de serviços no banco: ${totalServices}`);
console.log(`   Serviços disponíveis para Brasil: ${brazilServices}`);
console.log(`   Total de preços (serviço + operadora): ${brazilPrices}`);
console.log(`   Cobertura: ${((brazilServices / totalServices) * 100).toFixed(1)}%`);
console.log();

// Get top 20 services by price
const topServices = await db.execute(
  sql`SELECT 
        s.smshubCode,
        s.name,
        p.smshubPrice,
        p.ourPrice,
        p.quantityAvailable
      FROM prices p
      JOIN services s ON p.serviceId = s.id
      WHERE p.countryId = ${brazil.id}
      ORDER BY p.ourPrice DESC
      LIMIT 20`
);

console.log('💰 Top 20 serviços mais caros para Brasil:');
console.log('─'.repeat(80));
topServices[0].forEach((row, i) => {
  const smshubBRL = (row.smshubPrice / 100).toFixed(2);
  const ourBRL = (row.ourPrice / 100).toFixed(2);
  console.log(`${(i + 1).toString().padStart(2)}. ${row.name.padEnd(30)} R$ ${ourBRL.padStart(6)} (Disp: ${row.quantityAvailable})`);
});

// Get cheapest services
const cheapServices = await db.execute(
  sql`SELECT 
        s.smshubCode,
        s.name,
        p.smshubPrice,
        p.ourPrice,
        p.quantityAvailable
      FROM prices p
      JOIN services s ON p.serviceId = s.id
      WHERE p.countryId = ${brazil.id}
      ORDER BY p.ourPrice ASC
      LIMIT 20`
);

console.log();
console.log('💎 Top 20 serviços mais baratos para Brasil:');
console.log('─'.repeat(80));
cheapServices[0].forEach((row, i) => {
  const ourBRL = (row.ourPrice / 100).toFixed(2);
  console.log(`${(i + 1).toString().padStart(2)}. ${row.name.padEnd(30)} R$ ${ourBRL.padStart(6)} (Disp: ${row.quantityAvailable})`);
});

// Get most available services
const availableServices = await db.execute(
  sql`SELECT 
        s.smshubCode,
        s.name,
        p.ourPrice,
        p.quantityAvailable
      FROM prices p
      JOIN services s ON p.serviceId = s.id
      WHERE p.countryId = ${brazil.id}
      ORDER BY p.quantityAvailable DESC
      LIMIT 20`
);

console.log();
console.log('📦 Top 20 serviços com mais números disponíveis:');
console.log('─'.repeat(80));
availableServices[0].forEach((row, i) => {
  const ourBRL = (row.ourPrice / 100).toFixed(2);
  console.log(`${(i + 1).toString().padStart(2)}. ${row.name.padEnd(30)} ${row.quantityAvailable.toString().padStart(6)} números (R$ ${ourBRL})`);
});

await connection.end();
