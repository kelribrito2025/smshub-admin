import mysql from 'mysql2/promise';
import * as fs from 'fs';

const connection = await mysql.createConnection(process.env.DATABASE_URL);

const sql = fs.readFileSync('./drizzle/0024_daffy_nick_fury.sql', 'utf-8');
const statements = sql.split('--> statement-breakpoint');

for (const statement of statements) {
  const trimmed = statement.trim();
  if (!trimmed) continue;
  
  console.log('Executing:', trimmed.substring(0, 80) + '...');
  try {
    await connection.execute(trimmed);
    console.log('✅ Success');
  } catch (err) {
    console.error('❌ Error:', err.message);
  }
}

console.log('\n✅ Migration completed!');
await connection.end();
