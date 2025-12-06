import { SMSHubClient } from './server/smshub-client.ts';
import { getSetting } from './server/db-helpers.ts';

async function countBrazilServices() {
  const apiKeySetting = await getSetting('smshub_api_key');
  const client = new SMSHubClient(apiKeySetting.value);
  const allPrices = await client.getPrices();
  
  // Brazil has ID 12
  const brazilServices = allPrices['12'];
  
  if (brazilServices) {
    const serviceList = Object.keys(brazilServices);
    console.log(`\n=== BRAZIL (ID 12) ===`);
    console.log(`Total services: ${serviceList.length}`);
    console.log(`\nAll service codes:`);
    console.log(serviceList.sort().join(', '));
  } else {
    console.log('Brazil not found in API response');
  }
}

countBrazilServices();
