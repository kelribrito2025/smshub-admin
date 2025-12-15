import mysql from 'mysql2/promise';

const connection = await mysql.createConnection(process.env.DATABASE_URL);

const [columns] = await connection.execute(`DESCRIBE prices`);
console.log('Estrutura da tabela prices:');
console.table(columns);

await connection.end();
