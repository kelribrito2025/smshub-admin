/**
 * Script para enviar email de ativação para xkelrix@gmail.com
 */

import { sendActivationEmail } from './server/mailchimp-email';

async function sendToXkelrix() {
  console.log('Enviando email de ativação para xkelrix@gmail.com...');
  
  try {
    const success = await sendActivationEmail(
      'xkelrix@gmail.com',
      'Xkelrix',
      'test-customer-id-123'
    );
    
    if (success) {
      console.log('✅ Email enviado com sucesso!');
    } else {
      console.log('❌ Falha ao enviar email');
    }
  } catch (error) {
    console.error('❌ Erro ao enviar email:', error);
  }
}

sendToXkelrix();
