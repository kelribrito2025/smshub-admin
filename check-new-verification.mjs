import mysql from 'mysql2/promise';

const DATABASE_URL = process.env.DATABASE_URL;

async function checkVerifications() {
  const connection = await mysql.createConnection(DATABASE_URL);
  
  try {
    const [verifications] = await connection.execute(
      'SELECT * FROM email_verifications WHERE customerId = 720002 ORDER BY createdAt DESC',
      []
    );
    
    if (verifications.length === 0) {
      console.log('❌ Nenhum código de verificação encontrado para o novo cliente');
    } else {
      console.log(`✅ ${verifications.length} código(s) de verificação encontrado(s):\n`);
      verifications.forEach((v, i) => {
        const now = new Date();
        const expiresAt = new Date(v.expiresAt);
        const isExpired = now > expiresAt;
        
        console.log(`#${i + 1}:`);
        console.log(`   ID: ${v.id}`);
        console.log(`   Código: ${v.code}`);
        console.log(`   Criado em: ${v.createdAt}`);
        console.log(`   Expira em: ${v.expiresAt}`);
        console.log(`   Status: ${isExpired ? '❌ EXPIRADO' : '✅ VÁLIDO'}`);
        console.log('---');
      });
    }
  } finally {
    await connection.end();
  }
}

checkVerifications().catch(console.error);
