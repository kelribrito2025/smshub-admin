import { EfiPayClient } from './server/efipay-client.js';

console.log('🔍 Verificando configuração do webhook na EfiPay...\n');

try {
  const client = new EfiPayClient();
  const pixKey = process.env.EFIPAY_PIX_KEY;
  
  console.log(`📡 Chave PIX: ${pixKey}\n`);
  
  // Tentar obter configuração do webhook
  const webhookConfig = await client.getWebhookConfig();
  
  console.log('✅ Configuração do webhook:');
  console.log(JSON.stringify(webhookConfig, null, 2));
  
} catch (error) {
  console.error('❌ Erro ao verificar webhook:', error.message);
  if (error.response) {
    console.error('\n📄 Resposta da API:');
    console.error(JSON.stringify(error.response.data, null, 2));
  }
}
