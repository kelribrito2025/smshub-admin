import axios from 'axios';
import { getSetting } from './server/db-helpers.ts';

const BASE_URL = 'https://smshub.org/stubs/handler_api.php';

async function testOperators() {
  try {
    const apiKeySetting = await getSetting('smshub_api_key');
    if (!apiKeySetting?.value) {
      console.error('API key not found in database');
      return;
    }
    
    console.log('Using API key from database...\n');
    
    // Get numbers status for Brazil (country 73)
    const response = await axios.get(BASE_URL, {
      params: {
        api_key: apiKeySetting.value,
        action: 'getNumbersStatus',
        country: 73,
      }
    });
    
    console.log('Response status:', response.status);
    console.log('Response type:', typeof response.data);
    
    if (typeof response.data === 'string') {
      console.log('Response (string):', response.data);
      return;
    }
    
    console.log('\n=== Sample entries (first 15) ===');
    const entries = Object.entries(response.data).slice(0, 15);
    entries.forEach(([key, value]) => {
      console.log(`  ${key}: ${value}`);
    });
    
    console.log('\n=== Analyzing operator format ===');
    const operatorsSet = new Set();
    Object.keys(response.data).forEach(key => {
      const parts = key.split('_');
      if (parts.length === 2) {
        operatorsSet.add(parts[1]);
      }
    });
    
    console.log(`\nUnique operators found: ${operatorsSet.size}`);
    console.log('Operators:', Array.from(operatorsSet).sort().join(', '));
    
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
}

testOperators();
