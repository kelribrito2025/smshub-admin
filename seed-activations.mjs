import mysql from 'mysql2/promise';

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL not found in environment');
  process.exit(1);
}

async function seedActivations() {
  const connection = await mysql.createConnection(DATABASE_URL);
  
  try {
    console.log('🌱 Starting activations seed...\n');

    const serviceId = 60001; // Whatsapp
    const customerId = 7; // ID do customer de teste

    // Criar ativações mockadas para simular histórico
    // API 1: 70% sucesso (7 completas, 3 canceladas)
    // API 2: 95% sucesso (19 completas, 1 cancelada) ← MELHOR
    // API 3: 60% sucesso (6 completas, 4 canceladas)

    const activations = [
      // API 1 - 70% sucesso
      ...Array(7).fill(null).map((_, i) => ({ apiId: 1, status: 'completed' })),
      ...Array(3).fill(null).map((_, i) => ({ apiId: 1, status: 'cancelled' })),
      
      // API 2 - 95% sucesso (RECOMENDADA)
      ...Array(19).fill(null).map((_, i) => ({ apiId: 2, status: 'completed' })),
      ...Array(1).fill(null).map((_, i) => ({ apiId: 2, status: 'cancelled' })),
      
      // API 3 - 60% sucesso
      ...Array(6).fill(null).map((_, i) => ({ apiId: 3, status: 'completed' })),
      ...Array(4).fill(null).map((_, i) => ({ apiId: 3, status: 'cancelled' })),
    ];

    console.log('📊 Inserting mock activations:');
    console.log(`   API 1: 7 completed + 3 cancelled = 70% success`);
    console.log(`   API 2: 19 completed + 1 cancelled = 95% success ⭐`);
    console.log(`   API 3: 6 completed + 4 cancelled = 60% success\n`);

    for (const activation of activations) {
      await connection.execute(
        `INSERT INTO activations (userId, serviceId, countryId, apiId, phoneNumber, status, sellingPrice, createdAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, NOW() - INTERVAL FLOOR(RAND() * 30) DAY)`,
        [
          customerId,
          serviceId,
          1, // countryId (Brazil)
          activation.apiId,
          `+5511${Math.floor(Math.random() * 900000000 + 100000000)}`, // Random BR phone
          activation.status,
          190, // Mock price
        ]
      );
    }

    console.log(`✅ Inserted ${activations.length} mock activations\n`);

    // Verificar contagem por API
    const [stats] = await connection.execute(`
      SELECT 
        apiId,
        COUNT(*) as total,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled,
        ROUND(SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 1) as successRate
      FROM activations
      WHERE serviceId = ?
      GROUP BY apiId
      ORDER BY apiId
    `, [serviceId]);

    console.log('📈 Success rates by API:');
    console.table(stats);

    console.log('\n🎉 Seed completed! API 2 should now be recommended.');

  } catch (error) {
    console.error('❌ Seed failed:', error);
    process.exit(1);
  } finally {
    await connection.end();
  }
}

seedActivations();
