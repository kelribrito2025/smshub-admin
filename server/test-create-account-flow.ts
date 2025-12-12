/**
 * Script para testar o fluxo completo de criação de conta
 * Execute com: pnpm tsx server/test-create-account-flow.ts
 */

import { createCustomer, getCustomerByEmail } from './customers-helpers';
import { sendActivationEmail, sendWelcomeEmail } from './mailchimp-email';

async function main() {
  console.log('🧪 Testando fluxo completo de criação de conta...\n');
  
  const testEmail = `test-${Date.now()}@example.com`;
  const testName = 'Teste Fluxo Completo';

  console.log('📧 Email de teste:', testEmail);
  console.log('👤 Nome:', testName);
  console.log('');

  // Passo 1: Criar conta
  console.log('1️⃣ Criando conta...');
  try {
    const customer = await createCustomer({
      email: testEmail,
      name: testName,
      balance: 0,
      active: true,
    });

    console.log('   ✅ Conta criada com sucesso!');
    console.log('   ID:', customer.id);
    console.log('');

    // Passo 2: Enviar email de ativação
    console.log('2️⃣ Enviando email de ativação...');
    const activationSent = await sendActivationEmail(customer.email, customer.name, customer.id);
    
    if (activationSent) {
      console.log('   ✅ Email de ativação enviado com sucesso!');
    } else {
      console.log('   ❌ Falha ao enviar email de ativação');
    }
    console.log('');

    // Passo 3: Enviar email de boas-vindas
    console.log('3️⃣ Enviando email de boas-vindas...');
    const welcomeSent = await sendWelcomeEmail(customer.email, customer.name);
    
    if (welcomeSent) {
      console.log('   ✅ Email de boas-vindas enviado com sucesso!');
    } else {
      console.log('   ❌ Falha ao enviar email de boas-vindas');
    }
    console.log('');

    // Verificar se conta foi criada
    console.log('4️⃣ Verificando se conta foi criada...');
    const verifyCustomer = await getCustomerByEmail(testEmail);
    
    if (verifyCustomer) {
      console.log('   ✅ Conta verificada com sucesso!');
      console.log('   ID:', verifyCustomer.id);
      console.log('   Email:', verifyCustomer.email);
      console.log('   Nome:', verifyCustomer.name);
    } else {
      console.log('   ❌ Conta não encontrada');
    }

    console.log('');
    console.log('✅ Teste concluído com sucesso!');
    console.log('');
    console.log('📝 Resumo:');
    console.log('   - Conta criada: ✅');
    console.log(`   - Email de ativação: ${activationSent ? '✅' : '❌'}`);
    console.log(`   - Email de boas-vindas: ${welcomeSent ? '✅' : '❌'}`);

  } catch (error: any) {
    console.error('❌ Erro ao criar conta:', error.message);
    process.exit(1);
  }
}

main().catch(error => {
  console.error('❌ Erro:', error);
  process.exit(1);
});
