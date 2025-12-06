import axios from 'axios';
import * as dotenv from 'dotenv';
dotenv.config();

const API_KEY = process.env.SMSHUB_API_KEY || '';
const BASE_URL = 'https://smshub.org/stubs/handler_api.php';

async function testOperators() {
  try {
    // Get numbers status for Brazil (country 73)
    const response = await axios.get(BASE_URL, {
      params: {
        api_key: API_KEY,
        action: 'getNumbersStatus',
        country: 73,
      }
    });
    
    console.log('Response status:', response.status);
    console.log('Response data type:', typeof response.data);
    console.log('\nSample entries (first 10):');
    
    const entries = Object.entries(response.data).slice(0, 10);
    entries.forEach(([key, value]) => {
      console.log(`  ${key}: ${value}`);
    });
    
    console.log('\n--- Analyzing operator format ---');
    entries.forEach(([key, value]) => {
      const parts = key.split('_');
      if (parts.length === 2) {
        console.log(`Service: ${parts[0]}, Operator: ${parts[1]}, Quantity: ${value}`);
      }
    });
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testOperators();
