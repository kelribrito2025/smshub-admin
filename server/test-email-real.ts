/**
 * Script para testar envio de email para destinatário real
 * Execute com: pnpm tsx server/test-email-real.ts
 */

import { sendActivationEmail, sendWelcomeEmail } from './mailchimp-email';

async function main() {
  console.log('🔍 Testando envio de emails para destinatário real...\n');
  
  // Email de teste (substitua por um email real para teste)
  const testEmail = 'kelribrito@icloud.com'; // Email do usuário que reportou o problema
  const testName = 'Teste Produção';
  const testCustomerId = 99999;

  console.log('📧 Destinatário:', testEmail);
  console.log('');

  // Teste 1: Email de ativação
  console.log('1️⃣ Testando email de ativação...');
  try {
    const activationSent = await sendActivationEmail(testEmail, testName, testCustomerId);
    if (activationSent) {
      console.log('   ✅ Email de ativação enviado com sucesso!');
    } else {
      console.log('   ❌ Falha ao enviar email de ativação');
    }
  } catch (error: any) {
    console.error('   ❌ Erro:', error.message);
  }

  console.log('');

  // Teste 2: Email de boas-vindas
  console.log('2️⃣ Testando email de boas-vindas...');
  try {
    const welcomeSent = await sendWelcomeEmail(testEmail, testName);
    if (welcomeSent) {
      console.log('   ✅ Email de boas-vindas enviado com sucesso!');
    } else {
      console.log('   ❌ Falha ao enviar email de boas-vindas');
    }
  } catch (error: any) {
    console.error('   ❌ Erro:', error.message);
  }

  console.log('');
  console.log('✅ Teste concluído! Verifique a caixa de entrada de', testEmail);
}

main().catch(error => {
  console.error('❌ Erro:', error);
  process.exit(1);
});
