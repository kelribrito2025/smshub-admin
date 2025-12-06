#!/usr/bin/env tsx

import { EfiPayClient } from './server/efipay-client';

async function checkWebhook() {
  try {
    console.log('🔍 Verificando configuração do webhook na EfiPay...\n');
    
    const client = new EfiPayClient();
    
    // Get webhook configuration
    const pixKey = process.env.EFIPAY_PIX_KEY!;
    console.log(`🔑 Chave PIX: ${pixKey}\n`);
    
    // @ts-ignore - SDK method exists but not typed
    const result = await client.client.pixDetailWebhook({ chave: pixKey });
    
    console.log('✅ Webhook configurado!');
    console.log('\n📋 Detalhes:');
    console.log(JSON.stringify(result, null, 2));
    
  } catch (error: any) {
    console.error('❌ Erro ao verificar webhook:');
    console.error(error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.error('\n⚠️  Servidor não está respondendo');
    } else if (error.message?.includes('não cadastrado')) {
      console.error('\n⚠️  Webhook NÃO está configurado na EfiPay');
      console.error('Execute: pnpm tsx scripts/setup-webhook.ts');
    }
    
    if (error.response) {
      console.error('\n📄 Resposta da API:');
      console.error(JSON.stringify(error.response.data, null, 2));
    }
  }
}

checkWebhook();
