/**
 * Script para testar conexão Mandrill em produção
 * Execute com: pnpm tsx server/test-mandrill-prod.ts
 */

import { testMandrillConnection, sendEmail } from './mailchimp-email';

async function main() {
  console.log('🔍 Testando configuração do Mandrill em produção...\n');
  
  // Verificar variáveis de ambiente
  console.log('📋 Variáveis de ambiente:');
  console.log(`   MANDRILL_API_KEY: ${process.env.MANDRILL_API_KEY ? '✅ Configurada' : '❌ NÃO configurada'}`);
  console.log(`   MAILCHIMP_FROM_EMAIL: ${process.env.MAILCHIMP_FROM_EMAIL || '❌ NÃO configurada'}`);
  console.log(`   MAILCHIMP_FROM_NAME: ${process.env.MAILCHIMP_FROM_NAME || '❌ NÃO configurada'}`);
  console.log('');

  if (!process.env.MANDRILL_API_KEY) {
    console.error('❌ MANDRILL_API_KEY não está configurada!');
    console.error('   Isso explica por que os emails não são enviados em produção.');
    process.exit(1);
  }

  // Testar conexão
  console.log('🔌 Testando conexão com Mandrill...');
  const connectionOk = await testMandrillConnection();
  
  if (!connectionOk) {
    console.error('❌ Falha na conexão com Mandrill!');
    console.error('   Verifique se a API key está correta.');
    process.exit(1);
  }

  console.log('✅ Conexão com Mandrill OK!\n');

  // Tentar enviar email de teste
  const testEmail = process.env.MAILCHIMP_FROM_EMAIL || 'test@numero-virtual.com';
  console.log(`📧 Enviando email de teste para: ${testEmail}...`);
  
  const emailSent = await sendEmail({
    to: testEmail,
    subject: '🧪 Teste de Email - Produção',
    html: '<h1>Teste de Email</h1><p>Se você recebeu este email, o Mandrill está funcionando corretamente em produção!</p>',
  });

  if (emailSent) {
    console.log('✅ Email de teste enviado com sucesso!');
    console.log('   Verifique a caixa de entrada.');
  } else {
    console.error('❌ Falha ao enviar email de teste!');
    process.exit(1);
  }
}

main().catch(error => {
  console.error('❌ Erro:', error);
  process.exit(1);
});
