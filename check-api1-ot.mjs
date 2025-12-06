import mysql from 'mysql2/promise';

const connection = await mysql.createConnection(process.env.DATABASE_URL);

// Buscar serviço "Outros Apps" da API 1
const [results] = await connection.query(`
  SELECT p.id, s.name as service, c.name as country,
         p.smshubPrice, p.ourPrice, p.quantityAvailable,
         a.name as apiName
  FROM prices p
  LEFT JOIN services s ON p.serviceId = s.id
  LEFT JOIN countries c ON p.countryId = c.id
  LEFT JOIN sms_apis a ON p.apiId = a.id
  WHERE p.apiId = 1 
    AND s.name LIKE '%Outros%'
  LIMIT 5
`);

console.log('🔍 Serviços "Outros Apps" da API 1:\n');
console.table(results);

// Verificar configuração da API 1
const [apiConfig] = await connection.query(`
  SELECT id, name, url, priority, profit_percentage, minimum_price
  FROM sms_apis
  WHERE id = 1
`);

console.log('\n⚙️ Configuração da API 1:');
console.table(apiConfig);

await connection.end();
