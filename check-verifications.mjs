import mysql from 'mysql2/promise';

const DATABASE_URL = process.env.DATABASE_URL;

async function checkVerifications() {
  const connection = await mysql.createConnection(DATABASE_URL);
  
  try {
    const [verifications] = await connection.execute(
      'SELECT * FROM email_verifications WHERE customerId = 720001 ORDER BY createdAt DESC',
      []
    );
    
    if (verifications.length === 0) {
      console.log('❌ Nenhum código de verificação encontrado');
    } else {
      console.log(`✅ ${verifications.length} código(s) de verificação encontrado(s):\n`);
      verifications.forEach((v, i) => {
        console.log(`#${i + 1}:`);
        console.log(JSON.stringify(v, null, 2));
        console.log('---');
      });
    }
  } finally {
    await connection.end();
  }
}

checkVerifications().catch(console.error);
