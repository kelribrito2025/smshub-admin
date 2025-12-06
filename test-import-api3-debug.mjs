import 'dotenv/config';
import mysql from 'mysql2/promise';

const API_TOKEN = 'b9202b2bd66bf510e10d08f0A485fd27';
const API_URL = 'https://api.sms-activate.io/stubs/handler_api.php';

async function testImport() {
  console.log('🔍 Testando importação da API 3 (SMSActivate)...\n');

  // 1. Buscar preços da API
  const url = `${API_URL}?api_key=${API_TOKEN}&action=getPrices&country=73`;
  console.log('📡 Fazendo requisição:', url.replace(API_TOKEN, 'TOKEN_OCULTO'));
  
  const response = await fetch(url);
  const data = await response.json();
  
  console.log('\n📊 Resposta da API:');
  console.log('- Tipo:', typeof data);
  console.log('- Países encontrados:', Object.keys(data).length);
  console.log('- Primeiros países:', Object.keys(data).slice(0, 5));
  
  // Verificar se tem dados do Brasil (código 73)
  if (data['73']) {
    console.log('\n✅ Dados do Brasil (73) encontrados!');
    const brazilServices = data['73'];
    console.log('- Total de serviços:', Object.keys(brazilServices).length);
    console.log('- Primeiros 5 serviços:', Object.keys(brazilServices).slice(0, 5));
    
    // Analisar formato dos primeiros 3 serviços
    console.log('\n🔬 Analisando formato dos dados:');
    const firstServices = Object.entries(brazilServices).slice(0, 3);
    for (const [code, priceData] of firstServices) {
      console.log(`\nServiço: ${code}`);
      console.log('Dados:', JSON.stringify(priceData, null, 2));
      console.log('Tipo:', typeof priceData);
      
      // Tentar extrair preço
      if (typeof priceData === 'object' && priceData !== null) {
        const entries = Object.entries(priceData);
        console.log('Entradas:', entries.length);
        
        if (entries.length > 0) {
          const pricesAndQuantities = entries.map(([price, qty]) => ({
            price: parseFloat(String(price)),
            quantity: typeof qty === 'number' ? qty : 0
          })).filter(item => !isNaN(item.price) && item.price > 0);
          
          if (pricesAndQuantities.length > 0) {
            const lowestPrice = Math.min(...pricesAndQuantities.map(p => p.price));
            const totalQty = pricesAndQuantities.reduce((sum, item) => sum + item.quantity, 0);
            
            console.log(`✅ Preço extraído: R$ ${lowestPrice.toFixed(2)}`);
            console.log(`✅ Quantidade total: ${totalQty}`);
            console.log(`✅ Preço em centavos: ${Math.round(lowestPrice * 100)}`);
          }
        }
      }
    }
    
    // Testar importação no banco
    console.log('\n📝 Testando inserção no banco de dados...');
    const connection = await mysql.createConnection(process.env.DATABASE_URL);
    
    try {
      // Pegar primeiro serviço como teste
      const [testCode, testData] = Object.entries(brazilServices)[0];
      const entries = Object.entries(testData);
      
      if (entries.length > 0) {
        const pricesAndQuantities = entries.map(([price, qty]) => ({
          price: parseFloat(String(price)),
          quantity: typeof qty === 'number' ? qty : 0
        })).filter(item => !isNaN(item.price) && item.price > 0);
        
        if (pricesAndQuantities.length > 0) {
          const lowestPrice = Math.min(...pricesAndQuantities.map(p => p.price));
          const totalQty = pricesAndQuantities.reduce((sum, item) => sum + item.quantity, 0);
          const smshubPrice = Math.round(lowestPrice * 100);
          const ourPrice = Math.round(smshubPrice * 2); // 2x multiplier
          
          console.log(`\nServiço de teste: ${testCode}`);
          console.log(`- Preço fornecedor: ${smshubPrice} centavos (R$ ${(smshubPrice/100).toFixed(2)})`);
          console.log(`- Nosso preço: ${ourPrice} centavos (R$ ${(ourPrice/100).toFixed(2)})`);
          console.log(`- Quantidade: ${totalQty}`);
          
          // Verificar se serviço existe
          const [services] = await connection.execute(
            'SELECT id, name FROM services WHERE smshubCode = ? LIMIT 1',
            [testCode]
          );
          
          if (services.length > 0) {
            console.log(`✅ Serviço encontrado no banco: ${services[0].name} (ID: ${services[0].id})`);
          } else {
            console.log(`⚠️ Serviço não encontrado no banco, seria criado com nome: ${testCode.toUpperCase()}`);
          }
        }
      }
    } finally {
      await connection.end();
    }
    
  } else {
    console.log('\n❌ Dados do Brasil (73) NÃO encontrados!');
    console.log('Países disponíveis:', Object.keys(data));
  }
}

testImport().catch(console.error);
