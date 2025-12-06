import { getServiceApiOptions } from './server/service-api-options-helper.js';

// Tencent QQ service ID
const qqServiceId = 60002;
const brazilCountryId = 1;

const options = await getServiceApiOptions(qqServiceId, brazilCountryId);

console.log(`\n=== Tencent QQ API Options ===`);
console.log(`Total options: ${options.length}`);
options.forEach((opt, idx) => {
  console.log(`\n${idx + 1}. API ID: ${opt.apiId} - ${opt.apiName}`);
  console.log(`   Price: R$ ${(opt.price / 100).toFixed(2)}`);
  console.log(`   Available: ${opt.available}`);
});

process.exit(0);
