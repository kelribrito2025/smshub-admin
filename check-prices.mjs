import mysql from 'mysql2/promise';

const connection = await mysql.createConnection(process.env.DATABASE_URL);

const [rows] = await connection.execute(`
  SELECT 
    COUNT(*) as total_prices,
    SUM(CASE WHEN active = 1 THEN 1 ELSE 0 END) as active_prices,
    SUM(CASE WHEN active = 0 OR active IS NULL THEN 1 ELSE 0 END) as inactive_prices
  FROM prices
`);

console.log('Resultado da contagem de preços:');
console.log(JSON.stringify(rows, null, 2));

await connection.end();
