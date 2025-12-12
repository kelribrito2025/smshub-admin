/**
 * Script para testar fluxo completo de criação de conta
 * Execute com: pnpm tsx server/test-account-creation-flow.ts
 */

async function main() {
  console.log('🧪 Testando fluxo de criação de conta...\n');

  const testEmail = `test-${Date.now()}@example.com`;
  const testName = 'Usuário Teste';

  console.log(`📧 Email de teste: ${testEmail}`);
  console.log(`👤 Nome: ${testName}\n`);

  try {
    // Fazer requisição POST para criar conta
    const apiKey = 'sk_5cUTQ-0VggBg_-4Z1_RzqFOr3CdnMLEz00egdBK8A_hpOeVV';
    const response = await fetch('https://smshubadm-sokyccse.manus.space/api/public/customers', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': apiKey,
      },
      body: JSON.stringify({
        email: testEmail,
        name: testName,
      }),
    });

    const data = await response.json();

    if (response.ok) {
      console.log('✅ Conta criada com sucesso!');
      console.log(JSON.stringify(data, null, 2));
      console.log('\n📋 Agora verifique os logs do servidor para confirmar envio de emails:');
      console.log(`   - [REST API] Sending activation email to ${testEmail}...`);
      console.log(`   - [REST API] ✅ Activation email sent successfully to ${testEmail}`);
      console.log(`   - [REST API] Sending welcome email to ${testEmail}...`);
      console.log(`   - [REST API] ✅ Welcome email sent successfully to ${testEmail}`);
    } else {
      console.error('❌ Erro ao criar conta:', data);
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Erro na requisição:', error);
    process.exit(1);
  }
}

main();
