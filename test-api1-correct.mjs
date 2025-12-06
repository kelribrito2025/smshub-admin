import fetch from 'node-fetch';

const API_URL = 'https://api.sms24h.org/stubs/handler_api.php';
const API_TOKEN = '5115b2c78832b7f8a5150084c81f8734';

async function testAPI() {
  const url = `${API_URL}?api_key=${API_TOKEN}&action=getPrices&country=73`;
  
  console.log('🔍 Testing API 1 (SMS24h) with correct token...');
  console.log('URL:', url.replace(API_TOKEN, 'TOKEN_HIDDEN'));
  
  try {
    const response = await fetch(url);
    const text = await response.text();
    
    console.log('\n=== RAW RESPONSE (first 500 chars) ===');
    console.log(text.substring(0, 500));
    
    const data = JSON.parse(text);
    
    console.log('\n=== PARSED DATA ===');
    console.log('Type:', typeof data);
    console.log('Is object:', typeof data === 'object');
    console.log('Keys:', Object.keys(data).slice(0, 5));
    
    // Check if country 73 exists
    if (data['73']) {
      console.log('\n✅ COUNTRY 73 (Brazil) FOUND!');
      const services = Object.keys(data['73']);
      console.log('Total services:', services.length);
      console.log('First 10 services:', services.slice(0, 10));
      
      // Show first 3 service details
      console.log('\n=== FIRST 3 SERVICES DETAILS ===');
      for (let i = 0; i < 3 && i < services.length; i++) {
        const serviceCode = services[i];
        console.log(`\nService ${i+1}: ${serviceCode}`);
        console.log('Data:', JSON.stringify(data['73'][serviceCode], null, 2));
      }
    } else {
      console.log('\n❌ Country 73 NOT FOUND');
      console.log('Available countries:', Object.keys(data).slice(0, 10));
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  }
}

testAPI();
