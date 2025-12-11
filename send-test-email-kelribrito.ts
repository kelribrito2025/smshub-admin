/**
 * Script para enviar email de ativação para kelribrito@icloud.com
 */

import { sendActivationEmail } from './server/mailchimp-email';

async function sendToKelribrito() {
  console.log('Enviando email de ativação para kelribrito@icloud.com...');
  
  try {
    // Enviar email de ativação com ID fictício para teste
    const result = await sendActivationEmail(
      'kelribrito@icloud.com',
      'Kelvin',
      999999 // ID fictício para teste
    );
    
    if (result) {
      console.log('✅ Email enviado com sucesso!');
    } else {
      console.log('❌ Falha ao enviar email');
    }
  } catch (error) {
    console.error('❌ Erro ao enviar email:', error);
  }
}

sendToKelribrito();
