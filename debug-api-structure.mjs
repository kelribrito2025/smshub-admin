import { SMSHubClient } from './server/smshub-client.ts';
import { getSetting } from './server/db-helpers.ts';

async function debugAPI() {
  try {
    const apiKeySetting = await getSetting('smshub_api_key');
    const client = new SMSHubClient(apiKeySetting.value);
    const allPrices = await client.getPrices();
    
    console.log('=== Top-level keys (country codes) ===');
    const keys = Object.keys(allPrices);
    console.log(`Total keys: ${keys.length}`);
    console.log('First 20 keys:', keys.slice(0, 20).join(', '));
    
    // Check if Brazil exists with different codes
    const brazilKeys = keys.filter(k => k.toLowerCase().includes('braz') || k === '12' || k === 'br');
    console.log('\nBrazil-related keys:', brazilKeys);
    
    // Show service count for each key
    console.log('\n=== Service counts by country code ===');
    for (const key of keys.slice(0, 10)) {
      const services = allPrices[key];
      if (typeof services === 'object') {
        console.log(`${key}: ${Object.keys(services).length} services`);
      }
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

debugAPI();
