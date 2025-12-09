#!/usr/bin/env tsx

/**
 * Script para configurar webhook PIX na EfiPay
 * Execute uma única vez: pnpm tsx scripts/setup-webhook.ts
 */

import { EfiPayClient } from '../server/efipay-client';

async function setupWebhook() {
  console.log('🔧 Configurando webhook PIX na EfiPay...\n');

  const webhookUrl = 'https://smshubadm-sokyccse.manus.space/api/webhook/pix';
  
  try {
    const client = new EfiPayClient();
    
    console.log(`📡 URL do webhook: ${webhookUrl}`);
    console.log(`🔑 Chave PIX: ${process.env.EFIPAY_PIX_KEY}\n`);
    
    const result = await client.configureWebhook(webhookUrl);
    
    console.log('✅ Webhook configurado com sucesso!');
    console.log('\n📋 Detalhes:');
    console.log(JSON.stringify(result, null, 2));
    console.log('\n🎉 Pronto! Agora você já pode testar recargas PIX!');
    
  } catch (error: any) {
    console.error('❌ Erro ao configurar webhook:');
    console.error(error.message);
    
    if (error.response) {
      console.error('\n📄 Resposta da API:');
      console.error(JSON.stringify(error.response.data, null, 2));
    }
    
    process.exit(1);
  }
}

setupWebhook();
