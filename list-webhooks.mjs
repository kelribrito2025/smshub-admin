#!/usr/bin/env node
import { EfiPayClient } from './server/efipay-client.js';

console.log('🔍 Listando webhooks configurados na EfiPay...\n');

const client = new EfiPayClient();

try {
  const result = await client.client.pixListWebhook({});
  console.log('✅ Webhooks configurados:');
  console.log(JSON.stringify(result, null, 2));
} catch (error) {
  console.error('❌ Erro:', error.message);
  if (error.response?.data) {
    console.error('\nDetalhes:', JSON.stringify(error.response.data, null, 2));
  }
}
