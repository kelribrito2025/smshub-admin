import mysql from 'mysql2/promise';

const connection = await mysql.createConnection(process.env.DATABASE_URL);
const [apis] = await connection.query('SELECT id, name, url, token FROM sms_apis WHERE id IN (2,3) ORDER BY id');

for (const api of apis) {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`📡 ${api.name} (ID: ${api.id})`);
  console.log(`${'='.repeat(80)}\n`);
  
  try {
    const url = `${api.url}?api_key=${api.token}&action=getPrices&country=73`;
    const response = await fetch(url);
    const text = await response.text();
    
    console.log(`📥 Resposta RAW (primeiros 800 chars):`);
    console.log(text.substring(0, 800));
    console.log('\n...\n');
    
    const data = JSON.parse(text);
    const serviceKeys = Object.keys(data).slice(0, 5);
    
    console.log(`🔍 Primeiros 5 serviços:\n`);
    for (const key of serviceKeys) {
      const service = data[key];
      console.log(`Serviço "${key}":`);
      
      if (typeof service === 'object' && service !== null) {
        // Pegar primeiro preço
        const priceKeys = Object.keys(service);
        if (priceKeys.length > 0) {
          const firstPrice = service[priceKeys[0]];
          console.log(`  Primeiro preço (${priceKeys[0]}):`, JSON.stringify(firstPrice));
        }
      } else {
        console.log(`  Valor direto:`, service);
      }
      console.log('');
    }
    
  } catch (error) {
    console.error(`❌ Erro:`, error.message);
  }
}

await connection.end();
