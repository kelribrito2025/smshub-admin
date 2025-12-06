import { drizzle } from 'drizzle-orm/mysql2';
import { sql } from 'drizzle-orm';
import 'dotenv/config';

const db = drizzle(process.env.DATABASE_URL);

async function migrateCustomerPins() {
  try {
    console.log('Starting PIN migration...');
    
    // Get all customers ordered by ID
    const [customers] = await db.execute(sql`
      SELECT id FROM customers ORDER BY id ASC
    `);
    
    console.log(`Found ${customers.length} customers`);
    
    // Assign sequential PINs starting from 1
    for (let i = 0; i < customers.length; i++) {
      const customer = customers[i];
      const pin = i + 1;
      
      await db.execute(sql`
        UPDATE customers SET pin = ${pin} WHERE id = ${customer.id}
      `);
      
      if ((i + 1) % 10 === 0 || i === customers.length - 1) {
        console.log(`Assigned PINs 1-${i + 1}`);
      }
    }
    
    console.log('All PINs assigned successfully!');
    
    // Check for duplicates before adding constraint
    const [duplicates] = await db.execute(sql`
      SELECT pin, COUNT(*) as count 
      FROM customers 
      GROUP BY pin 
      HAVING count > 1
    `);
    
    if (duplicates.length > 0) {
      console.error('❌ Found duplicate PINs:', duplicates);
      process.exit(1);
    }
    
    console.log('No duplicates found, adding UNIQUE constraint...');
    
    // Add unique constraint
    await db.execute(sql`
      ALTER TABLE customers 
      ADD CONSTRAINT customers_pin_unique UNIQUE (pin)
    `);
    
    console.log('UNIQUE constraint added');
    
    // Add index
    await db.execute(sql`
      CREATE INDEX pin_idx ON customers(pin)
    `);
    
    console.log('Index created');
    
    console.log('✅ Migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    if (error.cause) {
      console.error('Cause:', error.cause.message);
    }
    process.exit(1);
  }
}

migrateCustomerPins();
