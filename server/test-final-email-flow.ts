/**
 * Teste final do fluxo de emails com email real
 * Execute com: pnpm tsx server/test-final-email-flow.ts
 */

import { sendActivationEmail, sendWelcomeEmail } from './mailchimp-email';

async function main() {
  console.log('🧪 Teste final: Fluxo de emails com destinatário real\n');
  
  // Usar email real para teste
  const testEmail = 'kelribrito@icloud.com';
  const testName = 'Kelvin Ribeiro';
  const testCustomerId = 999999;

  console.log('📧 Destinatário:', testEmail);
  console.log('👤 Nome:', testName);
  console.log('🆔 Customer ID:', testCustomerId);
  console.log('');

  // Teste 1: Email de ativação
  console.log('1️⃣ Enviando email de ativação...');
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

  // Aguardar 1 segundo entre emails
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Teste 2: Email de boas-vindas
  console.log('2️⃣ Enviando email de boas-vindas...');
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
  console.log('✅ Teste concluído!');
  console.log('📬 Verifique a caixa de entrada de', testEmail);
  console.log('');
  console.log('📝 Nota: Em produção, ambos os emails serão enviados automaticamente');
  console.log('   quando uma nova conta for criada via /api/public/customers');
}

main().catch(error => {
  console.error('❌ Erro:', error);
  process.exit(1);
});
