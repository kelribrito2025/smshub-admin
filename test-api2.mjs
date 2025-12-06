import axios from 'axios';

// API 2 - SMSHub (segunda opção)
const api2Url = 'https://smshub.org/stubs/handler_api.php';
const api2Token = '107241U2f5e8f0e2f2d8e0e2f2d8e0e2f2d8e0e2'; // Token exemplo

console.log('Testando API 2 (Opção 2 - SMSHub)...\n');

try {
  const response = await axios.get(api2Url, {
    params: {
      api_key: api2Token,
      action: 'getPrices',
      country: 73, // Brazil
    }
  });
  
  console.log('Status:', response.status);
  console.log('Tipo de resposta:', typeof response.data);
  
  const data = typeof response.data === 'string' ? JSON.parse(response.data) : response.data;
  
  if (data['73']) {
    const services = data['73'];
    console.log(`\nTotal de serviços: ${Object.keys(services).length}`);
    
    // Pegar primeiro serviço como exemplo
    const firstService = Object.entries(services)[0];
    console.log(`\nPrimeiro serviço: ${firstService[0]}`);
    console.log('Dados:', JSON.stringify(firstService[1], null, 2));
  } else {
    console.log('\nResposta completa:', JSON.stringify(data, null, 2));
  }
  
} catch (error) {
  console.error('Erro:', error.message);
  if (error.response) {
    console.error('Status:', error.response.status);
    console.error('Data:', error.response.data);
  }
}
