import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';

const DATABASE_URL = process.env.DATABASE_URL;

const connection = await mysql.createConnection({
  uri: DATABASE_URL,
  ssl: {
    rejectUnauthorized: true,
  },
});

const db = drizzle(connection);

try {
  console.log('Adding stripe_payment_intent_id column to recharges table...');
  
  await connection.execute(`
    ALTER TABLE recharges 
    ADD COLUMN stripe_payment_intent_id VARCHAR(255) NULL AFTER transactionId
  `);
  
  console.log('Column added successfully!');
  
  console.log('Adding index on stripe_payment_intent_id...');
  
  await connection.execute(`
    ALTER TABLE recharges 
    ADD INDEX recharge_stripe_payment_intent_idx (stripe_payment_intent_id)
  `);
  
  console.log('Index added successfully!');
  console.log('✅ Migration completed!');
} catch (error) {
  if (error.code === 'ER_DUP_FIELDNAME') {
    console.log('⚠️  Column already exists, skipping...');
  } else {
    console.error('❌ Error:', error.message);
    throw error;
  }
} finally {
  await connection.end();
}
