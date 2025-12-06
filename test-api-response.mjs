import axios from 'axios';

// Testar API 1 (SMSHub)
const api1Url = 'https://smshub.org/stubs/handler_api.php';
const api1Token = '107241Ud056a935ea159b3887c2b8b6f3922322';

console.log('Testing API 1 (SMSHub)...\n');
try {
  const response = await axios.get(api1Url, {
    params: {
      api_key: api1Token,
      action: 'getPrices',
      country: 73, // Brazil
    }
  });
  
  const data = typeof response.data === 'string' ? JSON.parse(response.data) : response.data;
  
  // Pegar primeiro país
  const firstCountry = Object.keys(data)[0];
  const services = data[firstCountry];
  
  // Pegar primeiros 5 serviços
  const firstServices = Object.entries(services).slice(0, 5);
  
  console.log(`Country: ${firstCountry}`);
  console.log(`Total services: ${Object.keys(services).length}\n`);
  
  firstServices.forEach(([code, priceData]) => {
    console.log(`Service: ${code}`);
    console.log(`Data:`, JSON.stringify(priceData, null, 2));
    console.log('---');
  });
} catch (error) {
  console.error('Error:', error.message);
}
