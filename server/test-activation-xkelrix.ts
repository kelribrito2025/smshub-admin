/**
 * Script para testar email de ativação para xkelrix@gmail.com
 * Execute com: pnpm tsx server/test-activation-xkelrix.ts
 */

import { sendActivationEmail } from './mailchimp-email';

async function main() {
  console.log('[Test Email] Enviando email de ativação...\n');

  const testEmail = 'xkelrix@gmail.com';
  const testName = 'Usuário Teste';
  const testCustomerId = 99999; // ID fictício para teste

  try {
    console.log(`[Test Email] Para: ${testEmail}`);
    console.log(`[Test Email] Nome: ${testName}`);
    console.log(`[Test Email] Customer ID: ${testCustomerId}\n`);

    const success = await sendActivationEmail(testEmail, testName, testCustomerId);

    if (success) {
      console.log('\n✅ [Test Email] Email de ativação enviado com sucesso!');
      console.log(`📧 Verifique a caixa de entrada de ${testEmail}`);
      console.log('📁 Verifique também a pasta de spam/lixo eletrônico');
    } else {
      console.error('\n❌ [Test Email] Falha ao enviar email de ativação');
      process.exit(1);
    }
  } catch (error) {
    console.error('\n❌ [Test Email] Erro ao enviar email:', error);
    process.exit(1);
  }
}

main();
