import fetch from 'node-fetch';

const API_URL = 'https://api.sms24h.org/stubs/handler_api.php';
const API_TOKEN = 'b9202b2bd66bf510e10d08f0A485fd27';

async function testAPI() {
  const url = `${API_URL}?api_key=${API_TOKEN}&action=getPrices&country=73`;
  
  console.log('Testing API 1 (SMS24h)...');
  console.log('URL:', url);
  
  try {
    const response = await fetch(url);
    const text = await response.text();
    
    console.log('\n=== RAW RESPONSE ===');
    console.log(text.substring(0, 500));
    
    const data = JSON.parse(text);
    
    console.log('\n=== PARSED DATA ===');
    console.log('Keys:', Object.keys(data).slice(0, 5));
    
    // Check if country 73 exists
    if (data['73']) {
      console.log('\n=== COUNTRY 73 (Brazil) ===');
      const services = Object.keys(data['73']);
      console.log('Total services:', services.length);
      console.log('First 5 services:', services.slice(0, 5));
      
      // Show first service details
      const firstService = services[0];
      console.log('\n=== FIRST SERVICE DETAILS ===');
      console.log('Service code:', firstService);
      console.log('Data:', JSON.stringify(data['73'][firstService], null, 2));
    } else {
      console.log('\nCountry 73 NOT FOUND');
      console.log('Available countries:', Object.keys(data).slice(0, 10));
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testAPI();
