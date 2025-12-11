/**
 * Teste manual para validar envio de email de ativação
 * Execute com: pnpm tsx server/test-activation-email.ts
 */

import { sendActivationEmail } from './mailchimp-email';

async function testActivationEmail() {
  console.log('🧪 Testando envio de email de ativação...\n');

  try {
    const result = await sendActivationEmail(
      'teste@example.com',
      'Usuário Teste',
      12345
    );

    if (result) {
      console.log('✅ Email de ativação enviado com sucesso!');
    } else {
      console.log('❌ Falha ao enviar email de ativação');
    }
  } catch (error) {
    console.error('❌ Erro ao enviar email:', error);
    process.exit(1);
  }
}

testActivationEmail();
