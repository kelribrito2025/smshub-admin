import axios from 'axios';

const API_URL = 'https://api.sms24h.org/stubs/handler_api.php';
const API_KEY = '107241Ud056a935ea159b3887c2b8b6f3922322';

console.log('🔍 Testando formato de resposta da API SMS24h...\n');

try {
  const response = await axios.get(API_URL, {
    params: {
      api_key: API_KEY,
      action: 'getPrices',
      country: 73 // Brazil
    },
    responseType: 'arraybuffer'
  });
  
  const decoder = new TextDecoder('iso-8859-1');
  const data = decoder.decode(response.data);
  
  const parsed = JSON.parse(data);
  
  // Verificar estrutura de alguns serviços com erro
  const testServices = ['ot', 'wa', 'ig', 'tg', 'fb'];
  
  console.log('📊 Estrutura dos serviços:\n');
  
  for (const service of testServices) {
    if (parsed['73'] && parsed['73'][service]) {
      console.log(`\n${service}:`, JSON.stringify(parsed['73'][service], null, 2));
    } else {
      console.log(`\n${service}: NOT FOUND`);
    }
  }
  
} catch (error) {
  console.error('❌ Erro:', error.message);
  if (error.response) {
    console.error('Status:', error.response.status);
    console.error('Data:', error.response.data);
  }
}
