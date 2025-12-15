import mysql from 'mysql2/promise';

const connection = await mysql.createConnection(process.env.DATABASE_URL);

// Verificar total de preços
const [totalPrices] = await connection.execute(`
  SELECT COUNT(*) as total FROM prices
`);
console.log('Total de registros na tabela prices:', totalPrices[0].total);

// Verificar preços com APIs ativas
const [pricesWithActiveApi] = await connection.execute(`
  SELECT COUNT(*) as total 
  FROM prices p
  LEFT JOIN sms_apis a ON p.api_id = a.id
  WHERE a.active = 1
`);
console.log('Preços com API ativa:', pricesWithActiveApi[0].total);

// Verificar preços com países ativos
const [pricesWithActiveCountry] = await connection.execute(`
  SELECT COUNT(*) as total 
  FROM prices p
  LEFT JOIN countries c ON p.country_id = c.id
  WHERE c.active = 1
`);
console.log('Preços com país ativo:', pricesWithActiveCountry[0].total);

// Verificar preços com serviços ativos
const [pricesWithActiveService] = await connection.execute(`
  SELECT COUNT(*) as total 
  FROM prices p
  LEFT JOIN services s ON p.service_id = s.id
  WHERE s.active = 1
`);
console.log('Preços com serviço ativo:', pricesWithActiveService[0].total);

// Verificar preços com TUDO ativo (API, país, serviço E price.active)
const [fullyActive] = await connection.execute(`
  SELECT COUNT(*) as total 
  FROM prices p
  LEFT JOIN sms_apis a ON p.api_id = a.id
  LEFT JOIN countries c ON p.country_id = c.id
  LEFT JOIN services s ON p.service_id = s.id
  WHERE a.active = 1 AND c.active = 1 AND s.active = 1 AND p.active = 1
`);
console.log('Preços totalmente ativos (API + país + serviço + price):', fullyActive[0].total);

// Verificar apenas price.active = 1
const [priceActive] = await connection.execute(`
  SELECT COUNT(*) as total FROM prices WHERE active = 1
`);
console.log('Preços com active = 1:', priceActive[0].total);

// Verificar APIs e suas contagens
const [apiCounts] = await connection.execute(`
  SELECT a.id, a.name, a.active, COUNT(p.id) as price_count
  FROM sms_apis a
  LEFT JOIN prices p ON a.id = p.api_id
  GROUP BY a.id, a.name, a.active
  ORDER BY a.id
`);
console.log('\nContagem por API:');
console.table(apiCounts);

await connection.end();
