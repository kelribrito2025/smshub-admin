import { sendActivationEmail } from './server/mailchimp-email.js';

async function testEmail() {
  console.log('📧 Testando envio de email de ativação...');
  console.log('   Para: kelribrito@icloud.com');
  console.log('   Customer ID: 99999');
  
  try {
    const result = await sendActivationEmail(
      'kelribrito@icloud.com',
      'Kelri',
      99999
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
