import mysql from 'mysql2/promise';

const DATABASE_URL = process.env.DATABASE_URL;

async function checkCustomer() {
  const connection = await mysql.createConnection(DATABASE_URL);
  
  try {
    const [rows] = await connection.execute(
      'SELECT id, pin, name, email, active, banned, emailVerified, createdAt FROM customers WHERE email = ?',
      ['criptomoedazcore@gmail.com']
    );
    
    if (rows.length === 0) {
      console.log('❌ Cliente não encontrado com este email');
    } else {
      console.log('✅ Cliente encontrado:');
      console.log(JSON.stringify(rows[0], null, 2));
    }
    
    // Check email verifications
    const [verifications] = await connection.execute(
      'SELECT * FROM email_verifications WHERE customerId = ? ORDER BY createdAt DESC LIMIT 1',
      [rows[0]?.id]
    );
    
    if (verifications.length > 0) {
      console.log('\n📧 Última verificação de email:');
      console.log(JSON.stringify(verifications[0], null, 2));
    }
  } finally {
    await connection.end();
  }
}

checkCustomer().catch(console.error);
