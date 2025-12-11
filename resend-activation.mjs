import { sendActivationEmail } from './server/mailchimp-email.js';
import { getCustomerByEmail } from './server/customers-helpers.js';

async function resend() {
  console.log('📧 Reenviando email de ativação...\n');
  
  const customer = await getCustomerByEmail('cralossouamelo@gmail.com');
  
  if (!customer) {
    console.error('❌ Cliente não encontrado');
    return;
  }
  
  console.log(`Cliente encontrado: ${customer.name} (ID: ${customer.id})`);
  console.log(`Email verificado: ${customer.emailVerified ? 'Sim' : 'Não'}\n`);
  
  const result = await sendActivationEmail(
    customer.email,
    customer.name,
    customer.id
  );
  
  if (result) {
    console.log('✅ Email de ativação reenviado com sucesso!');
  } else {
    console.error('❌ Falha ao reenviar email');
  }
}

resend().catch(console.error);
