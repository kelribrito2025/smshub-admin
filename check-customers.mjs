import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import 'dotenv/config';

const connection = await mysql.createConnection(process.env.DATABASE_URL);
const db = drizzle(connection);

const result = await connection.query('SELECT id, email, pin, balance FROM customers LIMIT 5');
console.log(JSON.stringify(result[0], null, 2));
await connection.end();
