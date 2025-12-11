/**
 * Script para enviar email de ativação de teste
 */

import { sendActivationEmail } from './server/mailchimp-email.js';

async function sendTestActivation() {
  const testEmail = 'xkelrix@gmail.com';
  const testName = 'Usuário Teste';
  const testCustomerId = 'test-' + Date.now();

  console.log(`Enviando email de ativação para ${testEmail}...`);
  
  try {
    const success = await sendActivationEmail(testEmail, testName, testCustomerId);
    
    if (success) {
      console.log('✅ Email enviado com sucesso!');
      console.log(`   Para: ${testEmail}`);
      console.log(`   Nome: ${testName}`);
      console.log(`   ID: ${testCustomerId}`);
    } else {
      console.error('❌ Falha ao enviar email');
    }
  } catch (error) {
    console.error('❌ Erro ao enviar email:', error);
  }
}

sendTestActivation();
