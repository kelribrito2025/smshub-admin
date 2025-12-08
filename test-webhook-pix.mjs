#!/usr/bin/env node

/**
 * Script para testar webhook PIX manualmente
 * Simula uma chamada da EfiPay para processar pagamento pendente
 */

import fetch from 'node-fetch';

const WEBHOOK_URL = 'https://app.numero-virtual.com/api/webhook/pix';

// Buscar txid da transação pendente mais recente
const txid = process.argv[2];

if (!txid) {
  console.error('❌ Erro: Forneça o TXID da transação');
  console.error('Uso: node test-webhook-pix.mjs <TXID>');
  process.exit(1);
}

// Payload simulado da EfiPay
const webhookPayload = {
  pix: [
    {
      endToEndId: `E18236120202408081234567890${Date.now()}`,
      txid: txid,
      valor: '1.00',
      horario: new Date().toISOString(),
      infoPagador: 'Teste Webhook Manual'
    }
  ]
};

console.log('🔧 Testando webhook PIX...\n');
console.log(`📡 URL: ${WEBHOOK_URL}`);
console.log(`🔑 TXID: ${txid}\n`);
console.log('📦 Payload:');
console.log(JSON.stringify(webhookPayload, null, 2));
console.log('\n🚀 Enviando requisição...\n');

try {
  const response = await fetch(WEBHOOK_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(webhookPayload),
  });

  const data = await response.json();

  console.log(`📊 Status: ${response.status} ${response.statusText}`);
  console.log('📄 Resposta:');
  console.log(JSON.stringify(data, null, 2));

  if (response.ok) {
    console.log('\n✅ Webhook processado com sucesso!');
    console.log('\n🔍 Verifique:');
    console.log('1. Status da transação mudou para "paid"');
    console.log('2. Saldo foi creditado');
    console.log('3. Registro aparece em /store/recharges');
  } else {
    console.log('\n❌ Webhook falhou!');
  }
} catch (error) {
  console.error('\n❌ Erro ao chamar webhook:', error.message);
  process.exit(1);
}
