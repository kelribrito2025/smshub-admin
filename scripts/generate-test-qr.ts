#!/usr/bin/env tsx
import { EfiPayClient } from '../server/efipay-client';

async function generateQR() {
  try {
    console.log('🔄 Gerando QR Code PIX de R$ 2,00...\n');
    
    const client = new EfiPayClient();
    const result = await client.createCharge({
      amount: 200,
      description: 'Teste de recarga - Monitoramento',
      expirationSeconds: 3600
    });
    
    console.log('✅ QR Code gerado!\n');
    console.log('📋 TXID:', result.txid);
    console.log('💰 Valor: R$ 2,00');
    console.log('⏰ Expira:', result.expiresAt.toLocaleString('pt-BR'));
    console.log('\n📱 PIX COPIA E COLA:\n');
    console.log(result.pixCopyPaste);
    console.log('\n🔗 QR CODE:\n');
    console.log(result.qrCodeUrl);
    console.log('\n✅ Aguardando pagamento...');
    
  } catch (error: any) {
    console.error('❌ Erro:', error.message);
    process.exit(1);
  }
}

generateQR();
