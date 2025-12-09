#!/usr/bin/env tsx

/**
 * Script para verificar webhook PIX configurado na EfiPay
 */

import { EfiPayClient } from '../server/efipay-client';

async function checkWebhook() {
  console.log('🔍 Verificando webhook PIX na EfiPay...\n');
  
  try {
    const client = new EfiPayClient();
    
    // A API da EfiPay não tem endpoint público para "GET webhook"
    // Mas podemos tentar configurar novamente e ver a resposta
    const webhookUrl = 'https://app.numero-virtual.com/api/webhook/pix';
    
    console.log(`📡 Verificando URL: ${webhookUrl}`);
    console.log(`🔑 Chave PIX: ${process.env.EFIPAY_PIX_KEY}\n`);
    
    const result = await client.configureWebhook(webhookUrl);
    
    console.log('✅ Webhook está configurado!');
    console.log('\n📋 Configuração atual:');
    console.log(JSON.stringify(result, null, 2));
    
  } catch (error: any) {
    console.error('❌ Erro ao verificar webhook:');
    console.error(error.message);
    
    if (error.response) {
      console.error('\n📄 Resposta da API:');
      console.error(JSON.stringify(error.response.data, null, 2));
    }
    
    process.exit(1);
  }
}

checkWebhook();
