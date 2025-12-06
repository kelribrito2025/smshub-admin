import axios from 'axios';

const API_URL = 'https://api.sms24h.org/stubs/handler_api.php';
const API_KEY = '107241Ud056a935ea159b3887c2b8b6f3922322';

console.log('🔍 Testando API SMS24h (API 1)...\n');

try {
  const response = await axios.get(API_URL, {
    params: {
      api_key: API_KEY,
      action: 'getPrices',
      country: 73, // Brazil
      service: 'ot' // Outros Apps
    },
    responseType: 'arraybuffer'
  });
  
  const decoder = new TextDecoder('iso-8859-1');
  const data = decoder.decode(response.data);
  
  console.log('📦 Resposta completa da API:');
  console.log(data);
  console.log('\n');
  
  // Tentar parsear como JSON
  try {
    const parsed = JSON.parse(data);
    console.log('📊 Dados parseados:');
    console.log(JSON.stringify(parsed, null, 2));
    
    // Verificar estrutura do serviço "ot"
    if (parsed['73'] && parsed['73']['ot']) {
      console.log('\n💰 Preços do serviço "ot" (Outros Apps):');
      console.log(JSON.stringify(parsed['73']['ot'], null, 2));
    }
  } catch (e) {
    console.log('❌ Não é JSON válido');
  }
  
} catch (error) {
  console.error('❌ Erro:', error.message);
}
