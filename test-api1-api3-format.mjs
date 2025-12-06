import mysql from 'mysql2/promise';

const connection = await mysql.createConnection(process.env.DATABASE_URL);
const [apis] = await connection.query('SELECT id, name, url, token FROM sms_apis WHERE id IN (1,3) ORDER BY id');

for (const api of apis) {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`📡 ${api.name} (ID: ${api.id})`);
  console.log(`${'='.repeat(80)}\n`);
  
  try {
    const url = `${api.url}?api_key=${api.token}&action=getPrices&country=73`;
    const response = await fetch(url);
    const text = await response.text();
    const data = JSON.parse(text);
    
    // Verificar estrutura
    console.log('Estrutura da resposta:', Object.keys(data).slice(0, 5));
    
    // Tentar acessar país 73
    const countryData = data['73'];
    if (countryData) {
      console.log('\n✅ Dados do país 73 encontrados');
      const services = Object.entries(countryData).slice(0, 3);
      
      for (const [serviceCode, priceData] of services) {
        console.log(`\nServiço: ${serviceCode}`);
        console.log('Dados:', JSON.stringify(priceData));
        
        // Extrair preço
        let priceValue;
        if (typeof priceData === 'object' && priceData.cost !== undefined) {
          priceValue = priceData.cost;
        }
        
        if (priceValue) {
          const smshubPrice = Math.round(priceValue * 100);
          console.log(`Preço API: R$ ${priceValue} → ${smshubPrice} centavos`);
        }
      }
    } else {
      console.log('❌ País 73 não encontrado na resposta');
      console.log('Chaves disponíveis:', Object.keys(data));
    }
    
  } catch (error) {
    console.error(`❌ Erro:`, error.message);
  }
}

await connection.end();
