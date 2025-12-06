import mysql from 'mysql2/promise';

const connection = await mysql.createConnection(process.env.DATABASE_URL);

// Buscar Brasil (country ID)
const [countries] = await connection.query('SELECT id, name, smshubId FROM countries WHERE name LIKE "%Brazil%" LIMIT 1');
if (countries.length === 0) {
  console.log('❌ País Brasil não encontrado no banco');
  await connection.end();
  process.exit(1);
}

const brazilCountry = countries[0];
console.log(`✅ País encontrado: ${brazilCountry.name} (ID: ${brazilCountry.id}, SMSHub ID: ${brazilCountry.smshubId})\n`);

// Buscar as 3 APIs
const [apis] = await connection.query('SELECT id, name, url, token FROM sms_apis ORDER BY priority LIMIT 3');

console.log('=== TESTE DE IMPORTAÇÃO REAL DE PREÇOS ===\n');

for (const api of apis) {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`📡 ${api.name} (ID: ${api.id})`);
  console.log(`${'='.repeat(80)}\n`);
  
  try {
    // Buscar preços da API
    const url = `${api.url}?api_key=${api.token}&action=getPrices&country=${brazilCountry.smshubId}`;
    const response = await fetch(url);
    const text = await response.text();
    const data = JSON.parse(text);
    
    // Pegar primeiro país (geralmente é o único)
    const countryData = data[brazilCountry.smshubId];
    if (!countryData) {
      console.log(`⚠️ Nenhum dado encontrado para país ${brazilCountry.smshubId}`);
      continue;
    }
    
    // Pegar primeiros 5 serviços
    const services = Object.entries(countryData).slice(0, 5);
    
    console.log(`📊 Primeiros 5 serviços:\n`);
    
    for (const [serviceCode, priceData] of services) {
      // Extrair preço
      let priceValue;
      
      if (typeof priceData === 'object' && priceData !== null) {
        // API 2 format: {"0.0181": 12320, "0.0183": 1}
        const prices = Object.keys(priceData)
          .map(p => parseFloat(p))
          .filter(p => !isNaN(p) && p > 0);
        
        if (prices.length > 0) {
          priceValue = Math.min(...prices); // Menor preço
        }
      }
      
      if (!priceValue) continue;
      
      // Aplicar conversão (REAIS → CENTAVOS)
      const smshubPrice = Math.round(priceValue * 100);
      const ourPrice = Math.round(smshubPrice * 1.5); // Markup de 50%
      
      console.log(`Serviço: ${serviceCode}`);
      console.log(`  Preço API: R$ ${priceValue.toFixed(4)}`);
      console.log(`  Preço Custo: ${smshubPrice} centavos (R$ ${(smshubPrice/100).toFixed(2)})`);
      console.log(`  Nosso Preço: ${ourPrice} centavos (R$ ${(ourPrice/100).toFixed(2)})`);
      console.log('');
    }
    
  } catch (error) {
    console.error(`❌ Erro ao testar ${api.name}:`, error.message);
  }
}

await connection.end();
