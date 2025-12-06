import mysql from 'mysql2/promise';

const connection = await mysql.createConnection(process.env.DATABASE_URL);

// Buscar tokens das APIs
const [apis] = await connection.query('SELECT id, name, url, token FROM sms_apis ORDER BY priority');

console.log('=== TESTANDO FORMATO DE PREÇOS DAS 3 APIs ===\n');

for (const api of apis) {
  console.log(`\n📡 ${api.name} (ID: ${api.id})`);
  console.log(`URL: ${api.url}`);
  
  try {
    const url = `${api.url}?api_key=${api.token}&action=getPrices&country=73`;
    const response = await fetch(url);
    const text = await response.text();
    
    console.log(`\n📥 Resposta RAW (primeiros 500 chars):`);
    console.log(text.substring(0, 500));
    
    // Tentar parsear como JSON
    try {
      const data = JSON.parse(text);
      const serviceKeys = Object.keys(data).slice(0, 3);
      
      console.log(`\n🔍 Estrutura dos primeiros 3 serviços:`);
      for (const key of serviceKeys) {
        console.log(`\nServiço "${key}":`);
        console.log(JSON.stringify(data[key], null, 2));
      }
    } catch (e) {
      console.log('⚠️ Não é JSON válido, tentando parsear como texto...');
      
      // Tentar extrair primeiro preço manualmente
      const match = text.match(/(\d+\.\d+)/);
      if (match) {
        console.log(`Primeiro valor numérico encontrado: ${match[1]}`);
      }
    }
    
  } catch (error) {
    console.error(`❌ Erro ao testar ${api.name}:`, error.message);
  }
  
  console.log('\n' + '='.repeat(80));
}

await connection.end();
