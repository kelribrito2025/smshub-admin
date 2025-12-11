/**
 * Script para enviar email de teste usando o template activation-email-cyber.html
 */

import { sendEmail } from './mailchimp-email.js';
import { renderActivationEmail } from './email-template-renderer.js';

async function sendTestEmail() {
  console.log('[Test Email] Iniciando envio de email de teste...');
  
  const testEmail = 'xkelrix@gmail.com';
  const testName = 'Usuário Teste';
  const testActivationLink = 'https://app.numero-virtual.com/activate?id=12345';
  
  try {
    // Renderizar o template com os dados de teste
    const html = renderActivationEmail(testName, testActivationLink, '24 horas');
    
    console.log('[Test Email] Template renderizado com sucesso');
    console.log('[Test Email] Enviando para:', testEmail);
    
    // Enviar o email
    const success = await sendEmail({
      to: testEmail,
      subject: '✅ Ative sua conta - Número Virtual',
      html,
    });
    
    if (success) {
      console.log('[Test Email] ✅ Email enviado com sucesso!');
      console.log('[Test Email] Destinatário:', testEmail);
      console.log('[Test Email] Template usado: activation-email-cyber.html');
    } else {
      console.error('[Test Email] ❌ Falha ao enviar email');
      process.exit(1);
    }
  } catch (error) {
    console.error('[Test Email] ❌ Erro ao enviar email:', error);
    process.exit(1);
  }
}

// Executar o teste
sendTestEmail();
