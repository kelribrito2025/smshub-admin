import { sendActivationEmail } from './server/mailchimp-email.js';

async function testEmail() {
  console.log('📧 Testando envio de email de ativação...');
  console.log('   Para: criptomoedazcore@gmail.com');
  console.log('   Customer ID: 720002');
  
  try {
    const result = await sendActivationEmail(
      'criptomoedazcore@gmail.com',
      'ttttt',
      720002
    );
    
    if (result) {
      console.log('✅ Email enviado com sucesso!');
    } else {
      console.log('❌ Falha ao enviar email (retornou false)');
    }
  } catch (error) {
    console.error('❌ Erro ao enviar email:', error);
  }
}

testEmail().catch(console.error);
