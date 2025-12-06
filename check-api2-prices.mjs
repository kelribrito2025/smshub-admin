import mysql from 'mysql2/promise';

const connection = await mysql.createConnection(process.env.DATABASE_URL);

// Contar registros por API
const [counts] = await connection.query(`
  SELECT apiId, COUNT(*) as total, 
         SUM(CASE WHEN quantityAvailable = 0 THEN 1 ELSE 0 END) as zero_qty,
         SUM(CASE WHEN quantityAvailable > 0 THEN 1 ELSE 0 END) as has_qty
  FROM prices 
  GROUP BY apiId
`);

console.log('Resumo de disponibilidade por API:\n');
console.table(counts);

// Pegar exemplos da API 2
const [api2Examples] = await connection.query(`
  SELECT p.id, s.name as service, c.name as country, 
         p.smshubPrice, p.ourPrice, p.quantityAvailable
  FROM prices p
  LEFT JOIN services s ON p.serviceId = s.id
  LEFT JOIN countries c ON p.countryId = c.id
  WHERE p.apiId = 2
  LIMIT 10
`);

console.log('\nExemplos de registros da API 2:');
console.table(api2Examples);

await connection.end();
