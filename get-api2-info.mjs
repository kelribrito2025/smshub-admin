import mysql from 'mysql2/promise';

const connection = await mysql.createConnection(process.env.DATABASE_URL);

const [apis] = await connection.query('SELECT id, name, url, token FROM sms_apis WHERE id = 2');

console.log('API 2 configurada:');
console.table(apis);

await connection.end();
