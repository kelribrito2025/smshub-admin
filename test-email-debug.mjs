/**
 * Script de teste para verificar envio de email de ativação
 */

// Env vars are already loaded in the environment

// Testar configuração do Mandrill
async function testMandrillConfig() {
  console.log('\n=== Verificando Configuração do Mandrill ===\n');
  
  const apiKey = process.env.MANDRILL_API_KEY;
  const fromEmail = process.env.MAILCHIMP_FROM_EMAIL;
  const fromName = process.env.MAILCHIMP_FROM_NAME;
  
  console.log('MANDRILL_API_KEY:', apiKey ? `${apiKey.substring(0, 10)}...` : '❌ NÃO CONFIGURADO');
  console.log('MAILCHIMP_FROM_EMAIL:', fromEmail || '❌ NÃO CONFIGURADO');
  console.log('MAILCHIMP_FROM_NAME:', fromName || '❌ NÃO CONFIGURADO');
  
  if (!apiKey) {
    console.error('\n❌ ERRO: MANDRILL_API_KEY não está configurado!');
    return false;
  }
  
  return true;
}

// Testar conexão com Mandrill
async function testMandrillConnection() {
  console.log('\n=== Testando Conexão com Mandrill ===\n');
  
  const apiKey = process.env.MANDRILL_API_KEY;
  
  try {
    const response = await fetch('https://mandrillapp.com/api/1.0/users/ping', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ key: apiKey }),
    });
    
    const result = await response.json();
    
    if (result === 'PONG!') {
      console.log('✅ Conexão com Mandrill OK!');
      return true;
    } else {
      console.error('❌ Resposta inesperada do Mandrill:', result);
      return false;
    }
  } catch (error) {
    console.error('❌ Erro ao conectar com Mandrill:', error.message);
    return false;
  }
}

// Testar envio de email de ativação
async function testActivationEmail(email) {
  console.log('\n=== Testando Envio de Email de Ativação ===\n');
  console.log('Email destino:', email);
  
  const apiKey = process.env.MANDRILL_API_KEY;
  const fromEmail = process.env.MAILCHIMP_FROM_EMAIL || 'noreply@numero-virtual.com';
  const fromName = process.env.MAILCHIMP_FROM_NAME || 'Número Virtual';
  
  const activationUrl = `https://app.numero-virtual.com/activate?id=999`;
  
  const html = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Ative sua conta - Número Virtual</title>
</head>
<body style="margin: 0; padding: 0; background-color: #ffffff; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
    <div style="min-height: 100vh; background-color: #ffffff; padding: 32px;">
        <div style="max-width: 700px; margin: 0 auto;">
            <div style="background: linear-gradient(to right, #4ade80, #22c55e); border-radius: 16px; padding: 32px; margin-bottom: 32px;">
                <h1 style="font-size: 36px; font-weight: bold; color: #000000; margin: 0; text-align: center;">
                    🎉 Ative sua conta!
                </h1>
            </div>
            
            <div style="padding: 0 16px;">
                <h2 style="font-size: 36px; font-weight: bold; color: #22c55e; margin-bottom: 24px;">
                    Olá, Teste!
                </h2>
                
                <p style="font-size: 20px; color: #374151; margin-bottom: 32px; line-height: 1.5;">
                    Bem-vindo ao <strong>Número Virtual</strong>! Para começar a usar nossa plataforma, você precisa ativar sua conta.
                </p>
                
                <div style="text-align: center; margin: 40px 0;">
                    <a href="${activationUrl}" style="display: inline-block; background: linear-gradient(to right, #4ade80, #22c55e); color: #000000; padding: 16px 48px; border-radius: 8px; text-decoration: none; font-size: 20px; font-weight: bold;">
                        Ativar Minha Conta
                    </a>
                </div>
                
                <p style="font-size: 16px; color: #6b7280; margin-top: 32px;">
                    Este link expira em <strong>24 horas</strong>.
                </p>
            </div>
        </div>
    </div>
</body>
</html>
  `;
  
  try {
    console.log('Enviando email via Mandrill...');
    
    const response = await fetch('https://mandrillapp.com/api/1.0/messages/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        key: apiKey,
        message: {
          html: html,
          subject: '✅ Ative sua conta - Número Virtual',
          from_email: fromEmail,
          from_name: fromName,
          to: [
            {
              email: email,
              type: 'to',
            },
          ],
          track_opens: true,
          track_clicks: true,
          auto_text: true,
          inline_css: true,
        },
      }),
    });
    
    if (!response.ok) {
      const error = await response.text();
      console.error('❌ Erro HTTP:', response.status, error);
      return false;
    }
    
    const result = await response.json();
    console.log('\n📧 Resposta do Mandrill:', JSON.stringify(result, null, 2));
    
    if (result[0]?.status === 'sent' || result[0]?.status === 'queued') {
      console.log('\n✅ Email enviado com sucesso!');
      console.log('Status:', result[0].status);
      console.log('ID:', result[0]._id);
      console.log('Reject reason:', result[0].reject_reason || 'N/A');
      return true;
    } else {
      console.error('\n❌ Email rejeitado!');
      console.error('Status:', result[0]?.status);
      console.error('Reject reason:', result[0]?.reject_reason);
      return false;
    }
  } catch (error) {
    console.error('❌ Erro ao enviar email:', error.message);
    return false;
  }
}

// Executar testes
async function main() {
  const testEmail = process.argv[2] || 'assini2024@gmail.com';
  
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║   TESTE DE ENVIO DE EMAIL DE ATIVAÇÃO - MANDRILL        ║');
  console.log('╚══════════════════════════════════════════════════════════╝');
  
  // 1. Verificar configuração
  const configOk = await testMandrillConfig();
  if (!configOk) {
    console.error('\n❌ Configuração inválida. Abortando testes.');
    process.exit(1);
  }
  
  // 2. Testar conexão
  const connectionOk = await testMandrillConnection();
  if (!connectionOk) {
    console.error('\n❌ Falha na conexão com Mandrill. Abortando testes.');
    process.exit(1);
  }
  
  // 3. Testar envio de email
  const emailOk = await testActivationEmail(testEmail);
  
  console.log('\n╔══════════════════════════════════════════════════════════╗');
  console.log('║                    RESULTADO FINAL                       ║');
  console.log('╚══════════════════════════════════════════════════════════╝\n');
  
  if (emailOk) {
    console.log('✅ Todos os testes passaram!');
    console.log(`✅ Email de ativação enviado para: ${testEmail}`);
    console.log('\n⚠️  IMPORTANTE: Verifique a caixa de SPAM do email!');
  } else {
    console.log('❌ Falha no envio do email.');
  }
}

main();
