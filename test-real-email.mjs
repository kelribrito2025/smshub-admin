import { sendActivationEmail } from './server/mailchimp-email.js';

async function test() {
  console.log('🧪 Testando envio de email de ativação para email real...\n');
  
  const result = await sendActivationEmail(
    'cralossouamelo@gmail.com',
    'Carlos',
    99999
  );
  
  if (result) {
    console.log('✅ Email enviado com sucesso!');
  } else {
    console.error('❌ Falha ao enviar email');
  }
}

test().catch(console.error);
