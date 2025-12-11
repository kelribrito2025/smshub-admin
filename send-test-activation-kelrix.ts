/**
 * Script para enviar email de ativação de teste para xkelrix@gmail.com
 */

import { sendActivationEmail } from './server/mailchimp-email';

const testEmail = 'xkelrix@gmail.com';
const testName = 'Kelri';
const testCustomerId = 99999;

async function sendTestEmail() {
  console.log('[Test] Enviando email de ativação de teste...');
  console.log('[Test] Para:', testEmail);
  console.log('[Test] Nome:', testName);
  console.log('[Test] Customer ID:', testCustomerId);
  
  try {
    const success = await sendActivationEmail(testEmail, testName, testCustomerId);
    
    if (success) {
      console.log('[Test] ✅ Email enviado com sucesso!');
      console.log('[Test] Verifique a caixa de entrada de', testEmail);
    } else {
      console.log('[Test] ❌ Falha ao enviar email');
    }
  } catch (error) {
    console.error('[Test] ❌ Erro ao enviar email:', error);
  }
}

sendTestEmail();
