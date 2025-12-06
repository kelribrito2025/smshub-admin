/**
 * Migration Script: Populate recharges table with historical data
 * 
 * This script creates recharge records for all paid PIX and Stripe transactions
 * that don't have a corresponding entry in the recharges table.
 * 
 * Run with: node server/migrate-recharges-history.mjs
 */

import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

async function migrateRechargesHistory() {
  const connection = await mysql.createConnection(process.env.DATABASE_URL);

  try {
    console.log('\n========== RECHARGES MIGRATION STARTED ==========\n');

    // 1. Migrate PIX transactions
    console.log('Step 1: Migrating PIX transactions...');
    
    const [pixTransactions] = await connection.execute(`
      SELECT 
        pt.id,
        pt.customerId,
        pt.txid,
        pt.amount,
        pt.paidAt,
        pt.createdAt
      FROM pix_transactions pt
      LEFT JOIN recharges r ON r.transactionId = pt.txid AND r.paymentMethod = 'pix'
      WHERE pt.status = 'paid' AND r.id IS NULL
      ORDER BY pt.paidAt ASC
    `);

    console.log(`Found ${pixTransactions.length} PIX transactions without recharge records`);

    let pixInserted = 0;
    for (const tx of pixTransactions) {
      try {
        await connection.execute(`
          INSERT INTO recharges (
            customerId,
            amount,
            paymentMethod,
            status,
            transactionId,
            completedAt,
            createdAt,
            updatedAt
          ) VALUES (?, ?, 'pix', 'completed', ?, ?, ?, ?)
        `, [
          tx.customerId,
          tx.amount,
          tx.txid,
          tx.paidAt,
          tx.createdAt,
          new Date()
        ]);
        
        pixInserted++;
        console.log(`  ✓ PIX ${tx.txid}: R$ ${(tx.amount / 100).toFixed(2)} - Customer ${tx.customerId}`);
      } catch (error) {
        console.error(`  ✗ Failed to insert PIX ${tx.txid}:`, error.message);
      }
    }

    console.log(`\nPIX migration complete: ${pixInserted}/${pixTransactions.length} records inserted\n`);

    // 2. Migrate Stripe transactions
    console.log('Step 2: Migrating Stripe transactions...');
    
    const [stripeTransactions] = await connection.execute(`
      SELECT 
        st.id,
        st.customerId,
        st.sessionId,
        st.amount,
        st.createdAt,
        st.updatedAt
      FROM stripe_transactions st
      LEFT JOIN recharges r ON r.transactionId = st.sessionId AND r.paymentMethod = 'card'
      WHERE st.status = 'completed' AND r.id IS NULL
      ORDER BY st.updatedAt ASC
    `);

    console.log(`Found ${stripeTransactions.length} Stripe transactions without recharge records`);

    let stripeInserted = 0;
    for (const tx of stripeTransactions) {
      try {
        await connection.execute(`
          INSERT INTO recharges (
            customerId,
            amount,
            paymentMethod,
            status,
            transactionId,
            completedAt,
            createdAt,
            updatedAt
          ) VALUES (?, ?, 'card', 'completed', ?, ?, ?, ?)
        `, [
          tx.customerId,
          tx.amount,
          tx.sessionId,
          tx.updatedAt,
          tx.createdAt,
          new Date()
        ]);
        
        stripeInserted++;
        console.log(`  ✓ Stripe ${tx.sessionId}: R$ ${(tx.amount / 100).toFixed(2)} - Customer ${tx.customerId}`);
      } catch (error) {
        console.error(`  ✗ Failed to insert Stripe ${tx.sessionId}:`, error.message);
      }
    }

    console.log(`\nStripe migration complete: ${stripeInserted}/${stripeTransactions.length} records inserted\n`);

    // 3. Summary
    console.log('========== MIGRATION SUMMARY ==========');
    console.log(`Total PIX records migrated: ${pixInserted}`);
    console.log(`Total Stripe records migrated: ${stripeInserted}`);
    console.log(`Total records migrated: ${pixInserted + stripeInserted}`);
    console.log('=======================================\n');

    // 4. Verify final state
    const [finalCount] = await connection.execute(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN paymentMethod = 'pix' THEN 1 ELSE 0 END) as pix_count,
        SUM(CASE WHEN paymentMethod = 'card' THEN 1 ELSE 0 END) as card_count
      FROM recharges
    `);

    console.log('Final recharges table state:');
    console.log(`  Total recharges: ${finalCount[0].total}`);
    console.log(`  PIX recharges: ${finalCount[0].pix_count}`);
    console.log(`  Card recharges: ${finalCount[0].card_count}`);
    console.log('');

  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    throw error;
  } finally {
    await connection.end();
  }
}

// Run migration
migrateRechargesHistory()
  .then(() => {
    console.log('✅ Migration completed successfully!\n');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  });
