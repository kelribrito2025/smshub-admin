// Variáveis de ambiente já injetadas pelo sistema
const MANDRILL_API_KEY = process.env.MANDRILL_API_KEY;
const MAILCHIMP_FROM_EMAIL = process.env.MAILCHIMP_FROM_EMAIL || "noreply@numero-virtual.com";
const MAILCHIMP_FROM_NAME = process.env.MAILCHIMP_FROM_NAME || "Número Virtual";

async function sendTestEmail() {
  const customerName = "kelri";
  const customerEmail = "kelri@numero-virtual.com";
  
  const html = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>Conta Confirmada - Número Virtual</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  
  <!-- Wrapper Table -->
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f5f5f5;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        
        <!-- Main Container -->
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          
          <!-- Header Banner -->
          <tr>
            <td align="center" style="padding: 0; background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); border-radius: 16px 16px 0 0;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="center" style="padding: 40px 20px;">
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td align="center" style="width: 64px; height: 64px; background-color: rgba(255, 255, 255, 0.2); border-radius: 12px; vertical-align: middle;">
                          <div style="font-size: 36px; line-height: 64px; color: #ffffff;">✅</div>
                        </td>
                      </tr>
                    </table>
                    <h1 style="margin: 20px 0 0 0; font-size: 32px; font-weight: bold; color: #ffffff; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">Conta Confirmada!</h1>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Body Content -->
          <tr>
            <td style="padding: 40px 30px;">
              
              <!-- Greeting -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="padding-bottom: 20px;">
                    <h2 style="margin: 0; font-size: 28px; font-weight: 600; color: #22c55e; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">Olá, ${customerName.split(' ')[0]}!</h2>
                  </td>
                </tr>
              </table>
              
              <!-- Message -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="padding-bottom: 20px;">
                    <p style="margin: 0 0 15px 0; font-size: 16px; line-height: 24px; color: #374151; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">Sua conta no <strong>Número Virtual</strong> foi confirmada com sucesso!</p>
                    <p style="margin: 0; font-size: 16px; line-height: 24px; color: #374151; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">Agora você pode:</p>
                  </td>
                </tr>
              </table>
              
              <!-- Features List -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="padding: 0 0 30px 0;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td style="padding: 8px 0;">
                          <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                            <tr>
                              <td style="width: 32px; height: 32px; background-color: rgba(34, 197, 94, 0.1); border-radius: 6px; vertical-align: middle; text-align: center;">
                                <div style="font-size: 16px; line-height: 32px; color: #22c55e;">✅</div>
                              </td>
                              <td style="padding-left: 12px; font-size: 16px; color: #374151; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">Fazer login na plataforma</td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0;">
                          <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                            <tr>
                              <td style="width: 32px; height: 32px; background-color: rgba(34, 197, 94, 0.1); border-radius: 6px; vertical-align: middle; text-align: center;">
                                <div style="font-size: 16px; line-height: 32px; color: #22c55e;">✅</div>
                              </td>
                              <td style="padding-left: 12px; font-size: 16px; color: #374151; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">Recarregar seu saldo</td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0;">
                          <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                            <tr>
                              <td style="width: 32px; height: 32px; background-color: rgba(34, 197, 94, 0.1); border-radius: 6px; vertical-align: middle; text-align: center;">
                                <div style="font-size: 16px; line-height: 32px; color: #22c55e;">✅</div>
                              </td>
                              <td style="padding-left: 12px; font-size: 16px; color: #374151; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">Ativar números SMS de qualquer país</td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0;">
                          <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                            <tr>
                              <td style="width: 32px; height: 32px; background-color: rgba(34, 197, 94, 0.1); border-radius: 6px; vertical-align: middle; text-align: center;">
                                <div style="font-size: 16px; line-height: 32px; color: #22c55e;">✅</div>
                              </td>
                              <td style="padding-left: 12px; font-size: 16px; color: #374151; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">Gerenciar suas ativações</td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              
              <!-- Login Button -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="left" style="padding: 10px 0 0 0;">
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td align="center" style="background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); border-radius: 10px; box-shadow: 0 4px 6px rgba(34, 197, 94, 0.3);">
                          <a href="https://app.numero-virtual.com/" style="display: inline-block; padding: 16px 48px; font-size: 18px; font-weight: bold; color: #000000; text-decoration: none; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">Fazer Login</a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td align="center" style="padding: 30px 20px; background-color: #f9fafb; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0 0 5px 0; font-size: 14px; color: #6b7280; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">Número Virtual</p>
              <p style="margin: 0; font-size: 12px; color: #9ca3af; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">© 2024 - Todos os direitos reservados</p>
            </td>
          </tr>
          
        </table>
        
      </td>
    </tr>
  </table>
  
</body>
</html>
  `;

  console.log("🚀 Enviando email de teste...");
  console.log(`📧 Para: ${customerEmail}`);
  console.log(`👤 Nome: ${customerName}`);

  try {
    const response = await fetch("https://mandrillapp.com/api/1.0/messages/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        key: MANDRILL_API_KEY,
        message: {
          from_email: MAILCHIMP_FROM_EMAIL,
          from_name: MAILCHIMP_FROM_NAME,
          to: [{ email: customerEmail, type: "to" }],
          subject: "✅ Sua conta foi confirmada!",
          html: html,
        },
      }),
    });

    const result = await response.json();
    
    if (response.ok && result[0]?.status === "sent") {
      console.log("✅ Email enviado com sucesso!");
      console.log("📬 Verifique sua caixa de entrada em:", customerEmail);
    } else {
      console.log("❌ Falha ao enviar email:", result);
    }
  } catch (error) {
    console.error("❌ Erro ao enviar email:", error);
  }
}

sendTestEmail();
