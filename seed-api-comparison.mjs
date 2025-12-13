import mysql from 'mysql2/promise';

const DATABASE_URL = process.env.DATABASE_URL;

async function seedApiComparison() {
  const connection = await mysql.createConnection(DATABASE_URL);
  
  try {
    console.log('🌱 Inserindo dados fictícios de comparação de APIs...\n');

    // Gerar dados para os últimos 30 dias
    const today = new Date();
    const days = 30;

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];

      // API 1 (Opção 1) - Performance boa e melhorando
      const api1SuccessRate = 65 + Math.random() * 15 + (i / days) * 10; // 65-90%, melhorando
      const api1Total = Math.floor(80 + Math.random() * 40);
      const api1Completed = Math.floor(api1Total * (api1SuccessRate / 100));
      const api1Cancelled = Math.floor((api1Total - api1Completed) * 0.7);
      const api1Expired = api1Total - api1Completed - api1Cancelled;

      await connection.execute(
        `INSERT INTO api_performance_stats (apiId, date, totalActivations, completed, cancelled, expired, successRate)
         VALUES (?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE 
         totalActivations = VALUES(totalActivations),
         completed = VALUES(completed),
         cancelled = VALUES(cancelled),
         expired = VALUES(expired),
         successRate = VALUES(successRate)`,
        [1, dateStr, api1Total, api1Completed, api1Cancelled, api1Expired, parseFloat(api1SuccessRate.toFixed(2))]
      );

      // API 2 (Opção 2) - Performance moderada e estável
      const api2SuccessRate = 55 + Math.random() * 10; // 55-65%, estável
      const api2Total = Math.floor(70 + Math.random() * 30);
      const api2Completed = Math.floor(api2Total * (api2SuccessRate / 100));
      const api2Cancelled = Math.floor((api2Total - api2Completed) * 0.6);
      const api2Expired = api2Total - api2Completed - api2Cancelled;

      await connection.execute(
        `INSERT INTO api_performance_stats (apiId, date, totalActivations, completed, cancelled, expired, successRate)
         VALUES (?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE 
         totalActivations = VALUES(totalActivations),
         completed = VALUES(completed),
         cancelled = VALUES(cancelled),
         expired = VALUES(expired),
         successRate = VALUES(successRate)`,
        [2, dateStr, api2Total, api2Completed, api2Cancelled, api2Expired, parseFloat(api2SuccessRate.toFixed(2))]
      );

      // API 3 (Opção 3) - Performance baixa e piorando
      const api3SuccessRate = 50 - (i / days) * 10 + Math.random() * 10; // 40-50%, piorando
      const api3Total = Math.floor(60 + Math.random() * 30);
      const api3Completed = Math.floor(api3Total * (api3SuccessRate / 100));
      const api3Cancelled = Math.floor((api3Total - api3Completed) * 0.8);
      const api3Expired = api3Total - api3Completed - api3Cancelled;

      await connection.execute(
        `INSERT INTO api_performance_stats (apiId, date, totalActivations, completed, cancelled, expired, successRate)
         VALUES (?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE 
         totalActivations = VALUES(totalActivations),
         completed = VALUES(completed),
         cancelled = VALUES(cancelled),
         expired = VALUES(expired),
         successRate = VALUES(successRate)`,
        [3, dateStr, api3Total, api3Completed, api3Cancelled, api3Expired, parseFloat(api3SuccessRate.toFixed(2))]
      );
    }

    console.log('✅ Dados fictícios inseridos com sucesso!');
    console.log('📊 Estatísticas geradas para os últimos 30 dias');
    console.log('   - API 1 (Opção 1): Performance boa e melhorando (65-90%)');
    console.log('   - API 2 (Opção 2): Performance moderada e estável (55-65%)');
    console.log('   - API 3 (Opção 3): Performance baixa e piorando (40-50%)');
    
  } catch (error) {
    console.error('❌ Erro ao inserir dados:', error);
    throw error;
  } finally {
    await connection.end();
  }
}

seedApiComparison();
