#!/usr/bin/env tsx

/**
 * Script para testar webhook PIX manualmente
 * Simula uma chamada da EfiPay para o webhook
 */

import axios from 'axios';

async function testWebhook() {
  console.log('🧪 Testando webhook PIX...\n');

  const webhookUrl = 'https://app.numero-virtual.com/api/webhook/pix';
  
  // Simular payload da EfiPay
  const payload = {
    pix: [
      {
        endToEndId: 'E18236120202412081523s0123456789',
        txid: 'TEST_' + Date.now(),
        valor: '2.99',
        horario: new Date().toISOString(),
        infoPagador: 'Teste manual do webhook'
      }
    ]
  };

  try {
    console.log(`📡 Enviando POST para: ${webhookUrl}`);
    console.log(`📦 Payload:`, JSON.stringify(payload, null, 2));
    console.log('');

    const response = await axios.post(webhookUrl, payload, {
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'EfiPay-Webhook-Test'
      },
      timeout: 10000
    });

    console.log('✅ Webhook respondeu com sucesso!');
    console.log(`📊 Status: ${response.status}`);
    console.log(`📄 Resposta:`, JSON.stringify(response.data, null, 2));

  } catch (error: any) {
    console.error('❌ Erro ao chamar webhook:');
    
    if (error.response) {
      console.error(`📊 Status: ${error.response.status}`);
      console.error(`📄 Resposta:`, JSON.stringify(error.response.data, null, 2));
    } else if (error.request) {
      console.error('❌ Nenhuma resposta recebida do servidor');
      console.error('Possíveis causas:');
      console.error('  - Servidor offline');
      console.error('  - Timeout de rede');
      console.error('  - Firewall bloqueando requisição');
    } else {
      console.error(error.message);
    }
    
    process.exit(1);
  }
}

testWebhook();
