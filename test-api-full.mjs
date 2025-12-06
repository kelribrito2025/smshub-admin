import { SMSHubClient } from './server/smshub-client.ts';
import { getSetting } from './server/db-helpers.ts';

async function testAPIResponse() {
  try {
    const apiKeySetting = await getSetting('smshub_api_key');
    if (!apiKeySetting?.value) {
      console.error('API key not found');
      return;
    }

    const client = new SMSHubClient(apiKeySetting.value);
    
    // Test WITHOUT country filter
    console.log('=== Testing WITHOUT country filter ===');
    const allPrices = await client.getPrices();
    
    console.log('Type:', typeof allPrices);
    console.log('Top-level keys:', Object.keys(allPrices).slice(0, 10));
    
    let totalCountries = 0;
    let totalServices = 0;
    
    for (const [key, value] of Object.entries(allPrices)) {
      if (typeof value === 'object' && value !== null) {
        totalCountries++;
        const serviceCount = Object.keys(value).length;
        totalServices += serviceCount;
        
        if (totalCountries <= 3) {
          console.log(`\nCountry/Key "${key}": ${serviceCount} services`);
          console.log('Sample:', Object.keys(value).slice(0, 3).join(', '));
        }
      }
    }
    
    console.log(`\n=== SUMMARY ===`);
    console.log(`Total countries/keys: ${totalCountries}`);
    console.log(`Total services: ${totalServices}`);
    
  } catch (error) {
    console.error('Error:', error.message);
    console.error(error.stack);
  }
}

testAPIResponse();
