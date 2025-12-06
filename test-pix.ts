#!/usr/bin/env tsx

import { EfiPayClient } from './server/efipay-client';

async function testPixCharge() {
  try {
    console.log('🧪 Testando criação de cobrança PIX...\n');
    
    const client = new EfiPayClient();
    
    const result = await client.createCharge({
      amount: 2000, // R$ 20,00
      description: 'Recarga de saldo - Teste',
      expirationSeconds: 3600,
    });
    
    console.log('✅ Cobrança criada com sucesso!');
    console.log('\n📋 Detalhes:');
    console.log('TXID:', result.txid);
    console.log('PIX Copia e Cola:', result.pixCopyPaste.substring(0, 50) + '...');
    console.log('QR Code URL:', result.qrCodeUrl);
    console.log('Expira em:', result.expiresAt);
    
  } catch (error: any) {
    console.error('❌ Erro ao criar cobrança:');
    console.error(error.message);
    console.error('\n📄 Detalhes completos:');
    console.error(error);
  }
}

testPixCharge();
