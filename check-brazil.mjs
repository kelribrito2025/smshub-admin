import { SMSHubClient } from './server/smshub-client.ts';
import { getSetting } from './server/db-helpers.ts';

async function checkBrazil() {
  const apiKeySetting = await getSetting('smshub_api_key');
  const client = new SMSHubClient(apiKeySetting.value);
  const allPrices = await client.getPrices();
  
  // Check Brazil with ID 12 (as string)
  if (allPrices['12']) {
    const services = Object.keys(allPrices['12']);
    console.log(`Brazil (ID "12"): ${services.length} services`);
    console.log('First 10:', services.slice(0, 10).join(', '));
  } else {
    console.log('Brazil (ID "12") not found');
  }
  
  // Check all countries
  console.log('\n=== All countries with service counts ===');
  for (const [id, services] of Object.entries(allPrices)) {
    console.log(`Country ${id}: ${Object.keys(services).length} services`);
  }
}

checkBrazil();
