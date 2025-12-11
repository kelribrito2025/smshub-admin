/**
 * Script para enviar email de teste de ativação para kelribrito@icloud.com
 * Execute com: pnpm tsx server/send-test-activation.ts
 */

import { sendActivationEmail } from './mailchimp-email';

async function main() {
  console.log('[Test Email] Iniciando envio de email de teste de ativação...\n');

  const testEmail = 'kelribrito@icloud.com';
  const testName = 'Kelri';
  const testCustomerId = 99999; // ID fictício para teste

  try {
    console.log(`[Test Email] Enviando para: ${testEmail}`);
    console.log(`[Test Email] Nome: ${testName}`);
    console.log(`[Test Email] Customer ID: ${testCustomerId}\n`);

    const success = await sendActivationEmail(testEmail, testName, testCustomerId);

    if (success) {
      console.log('\n✅ [Test Email] Email de ativação enviado com sucesso!');
      console.log(`📧 Verifique a caixa de entrada de ${testEmail}`);
    } else {
      console.error('\n❌ [Test Email] Falha ao enviar email de ativação');
    }
  } catch (error) {
    console.error('\n❌ [Test Email] Erro ao enviar email:', error);
  }
}

main();
