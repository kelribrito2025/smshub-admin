import { sendActivationEmail } from './server/mailchimp-email.js';

async function testRealEmail() {
  console.log('📧 Testando envio de email de ativação para email REAL...');
  console.log('   Para: criptomoedazcore@gmail.com');
  console.log('   Nome: ttttt');
  console.log('   Customer ID: 720002');
  console.log('');
  
  try {
    const result = await sendActivationEmail(
      'criptomoedazcore@gmail.com',
      'ttttt',
      720002
    );
    
    if (result) {
      console.log('✅ Email enviado com sucesso!');
      console.log('   Por favor, verifique sua caixa de entrada e pasta de spam.');
    } else {
      console.log('❌ Falha ao enviar email (retornou false)');
    }
  } catch (error) {
    console.error('❌ Erro ao enviar email:', error);
  }
}

testRealEmail().catch(console.error);
