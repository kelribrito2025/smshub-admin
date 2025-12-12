/**
 * Script para enviar email de boas-vindas para xkelrix@gmail.com
 * Execute com: pnpm tsx server/send-welcome-to-user.ts
 */

import { sendWelcomeEmail } from './mailchimp-email';

async function main() {
  console.log('[Test Email] Enviando email de boas-vindas...\n');

  const testEmail = 'xkelrix@gmail.com';
  const testName = 'Usuário Teste';

  try {
    console.log(`[Test Email] Para: ${testEmail}`);
    console.log(`[Test Email] Nome: ${testName}\n`);

    const success = await sendWelcomeEmail(testEmail, testName);

    if (success) {
      console.log('\n✅ [Test Email] Email de boas-vindas enviado com sucesso!');
      console.log(`📧 Verifique a caixa de entrada de ${testEmail}`);
      console.log('📁 Verifique também a pasta de spam/lixo eletrônico');
    } else {
      console.log('\n❌ [Test Email] Falha ao enviar email');
      console.log('Verifique os logs acima para mais detalhes');
    }
  } catch (error) {
    console.error('\n❌ [Test Email] Erro ao enviar email:', error);
    process.exit(1);
  }
}

main();
