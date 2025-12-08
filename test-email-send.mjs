#!/usr/bin/env node

/**
 * Script de teste rápido para validar envio de email via Mailchimp
 * Uso: node test-email-send.mjs <email-destino>
 */

import Mailchimp from '@mailchimp/mailchimp_transactional';
import 'dotenv/config';

const email = process.argv[2];

if (!email) {
  console.error('❌ Erro: Email de destino não fornecido');
  console.log('Uso: node test-email-send.mjs <email-destino>');
  process.exit(1);
}

if (!process.env.MAILCHIMP_API_KEY) {
  console.error('❌ Erro: MAILCHIMP_API_KEY não configurada');
  process.exit(1);
}

console.log('🔍 Testando envio de email via Mailchimp...\n');
console.log('Configuração:');
console.log(`  - API Key: ${process.env.MAILCHIMP_API_KEY.substring(0, 10)}...`);
console.log(`  - From: ${process.env.MAILCHIMP_FROM_NAME} <${process.env.MAILCHIMP_FROM_EMAIL}>`);
console.log(`  - To: ${email}\n`);

const mailchimp = Mailchimp(process.env.MAILCHIMP_API_KEY);

const testCode = Math.floor(100000 + Math.random() * 900000).toString();

const message = {
  from_email: process.env.MAILCHIMP_FROM_EMAIL || 'noreply@numero-virtual.com',
  from_name: process.env.MAILCHIMP_FROM_NAME || 'NumeroVirtual',
  subject: '🧪 Teste de Email - Número Virtual',
  to: [{ email, type: 'to' }],
  html: `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { 
          font-family: 'Courier New', monospace; 
          background: #000; 
          color: #00ff41; 
          margin: 0;
          padding: 20px;
        }
        .container { 
          max-width: 600px; 
          margin: 0 auto; 
          padding: 40px 20px; 
          border: 2px solid #00D26A;
          border-radius: 8px;
        }
        .header { 
          text-align: center; 
          margin-bottom: 30px; 
        }
        .code { 
          background: #00D26A; 
          color: #000; 
          font-size: 32px; 
          font-weight: bold; 
          padding: 20px; 
          text-align: center; 
          border-radius: 8px;
          letter-spacing: 8px;
          margin: 30px 0;
        }
        .footer {
          text-align: center;
          margin-top: 30px;
          font-size: 12px;
          color: #00D26A;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1 style="color: #00D26A;">🧪 TESTE DE EMAIL</h1>
          <p>Número Virtual - Sistema de Verificação</p>
        </div>
        
        <p>Este é um email de teste para validar a integração com Mailchimp.</p>
        
        <p>Seu código de teste é:</p>
        
        <div class="code">${testCode}</div>
        
        <p>Se você recebeu este email, significa que:</p>
        <ul>
          <li>✅ API Key do Mailchimp está correta</li>
          <li>✅ Domínio está verificado</li>
          <li>✅ Sistema de envio está funcionando</li>
        </ul>
        
        <div class="footer">
          <p>━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━</p>
          <p>Número Virtual - Sistema de SMS Online</p>
        </div>
      </div>
    </body>
    </html>
  `,
};

console.log('📧 Enviando email de teste...\n');

try {
  const response = await mailchimp.messages.send({ message });
  
  console.log('✅ Email enviado com sucesso!\n');
  console.log('Resposta do Mailchimp:');
  console.log(JSON.stringify(response, null, 2));
  
  if (response[0]?.status === 'sent') {
    console.log('\n🎉 Status: SENT');
    console.log(`📧 Verifique a caixa de entrada de: ${email}`);
    console.log(`🔢 Código de teste: ${testCode}`);
  } else if (response[0]?.status === 'rejected') {
    console.log('\n❌ Status: REJECTED');
    console.log(`Motivo: ${response[0]?.reject_reason || 'Desconhecido'}`);
  } else {
    console.log(`\n⚠️ Status: ${response[0]?.status || 'Desconhecido'}`);
  }
  
} catch (error) {
  console.error('\n❌ Erro ao enviar email:');
  console.error(error.message);
  
  if (error.response) {
    console.error('\nDetalhes do erro:');
    console.error(JSON.stringify(error.response.data, null, 2));
  }
  
  process.exit(1);
}
