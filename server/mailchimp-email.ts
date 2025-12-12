/**
 * Mandrill (Mailchimp Transactional) Email Helper
 * Sends transactional emails using Mandrill API
 */

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  fromName?: string;
  fromEmail?: string;
}

/**
 * Send transactional email via Mandrill
 */
export async function sendEmail(options: EmailOptions): Promise<boolean> {
  const startTime = Date.now();
  console.log(`[Mandrill] 📧 Attempting to send email to: ${options.to}`);
  console.log(`[Mandrill]    Subject: ${options.subject}`);
  
  try {
    const apiKey = process.env.MANDRILL_API_KEY;
    const fromEmail = options.fromEmail || process.env.MAILCHIMP_FROM_EMAIL || "noreply@numero-virtual.com";
    const fromName = options.fromName || process.env.MAILCHIMP_FROM_NAME || "Número Virtual";

    console.log(`[Mandrill]    From: ${fromName} <${fromEmail}>`);
    console.log(`[Mandrill]    API Key present: ${apiKey ? 'YES' : 'NO'}`);

    if (!apiKey) {
      console.error("[Mandrill] ❌ CRITICAL: API key not configured");
      return false;
    }

    const mandrillUrl = "https://mandrillapp.com/api/1.0/messages/send";
    
    console.log(`[Mandrill]    Making API call to: ${mandrillUrl}`);
    
    const payload = {
      key: apiKey,
      message: {
        html: options.html,
        subject: options.subject,
        from_email: fromEmail,
        from_name: fromName,
        to: [
          {
            email: options.to,
            type: "to",
          },
        ],
        track_opens: true,
        track_clicks: true,
        auto_text: true,
        inline_css: true,
      },
    };
    
    const response = await fetch(mandrillUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const elapsed = Date.now() - startTime;
    console.log(`[Mandrill]    Response received in ${elapsed}ms`);
    console.log(`[Mandrill]    HTTP Status: ${response.status}`);
    
    if (!response.ok) {
      const error = await response.text();
      console.error("[Mandrill] ❌ HTTP Error:", {
        status: response.status,
        statusText: response.statusText,
        body: error,
      });
      return false;
    }

    const result = await response.json();
    console.log(`[Mandrill]    Full API response:`, JSON.stringify(result, null, 2));
    
    // Check if email was sent successfully
    if (result[0]?.status === "sent" || result[0]?.status === "queued") {
      const totalElapsed = Date.now() - startTime;
      console.log(`[Mandrill] ✅ Email ${result[0].status} successfully in ${totalElapsed}ms:`, {
        to: options.to,
        subject: options.subject,
        status: result[0].status,
        id: result[0]._id,
      });
      return true;
    } else if (result[0]?.status === "rejected") {
      console.error(`[Mandrill] ❌ Email REJECTED:`, {
        to: options.to,
        status: result[0].status,
        reject_reason: result[0].reject_reason,
        full_response: result[0],
      });
      return false;
    } else if (result[0]?.status === "invalid") {
      console.error(`[Mandrill] ❌ Email INVALID:`, {
        to: options.to,
        status: result[0].status,
        full_response: result[0],
      });
      return false;
    } else {
      console.error("[Mandrill] ❌ Unexpected status:", result[0]);
      return false;
    }
  } catch (error: any) {
    const elapsed = Date.now() - startTime;
    console.error(`[Mandrill] ❌ EXCEPTION after ${elapsed}ms:`, {
      to: options.to,
      subject: options.subject,
      error_name: error.name,
      error_message: error.message,
      error_stack: error.stack,
    });
    return false;
  }
}

/**
 * Test Mandrill API connection
 */
export async function testMandrillConnection(): Promise<boolean> {
  try {
    const apiKey = process.env.MANDRILL_API_KEY;
    if (!apiKey) {
      console.error("[Mandrill] API key not configured");
      return false;
    }

    const response = await fetch("https://mandrillapp.com/api/1.0/users/ping", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ key: apiKey }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("[Mandrill] Connection test failed:", error);
      return false;
    }

    const result = await response.json();
    console.log("[Mandrill] Connection test successful:", result);
    return result === "PONG!";
  } catch (error) {
    console.error("[Mandrill] Connection test error:", error);
    return false;
  }
}

/**
 * Send welcome email to new customer
 */
export async function sendWelcomeEmail(customerEmail: string, customerName: string): Promise<boolean> {
  const html = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Bem-vindo ao Número Virtual</title>
</head>
<body style="margin: 0; padding: 0; background-color: #ffffff; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <!-- FUNDO EXTERNO BRANCO -->
  <table style="background-color: #ffffff; padding: 40px 0px; width: 100%;" border="0" width="100%" cellspacing="0" cellpadding="0">
    <tbody>
      <tr>
        <td style="width: 100%;" align="center">
          <!-- CAIXA INTERNA ESCURA -->
          <table style="background-color: #0e1522; border: 2px solid #00ab45; border-radius: 2px; box-shadow: rgba(0, 171, 69, 0.25) 0px 0px 40px; overflow: hidden; max-width: 437px;" border="0" width="437" cellspacing="0" cellpadding="0">
            <tbody>
              <!-- BARRA SUPERIOR -->
              <tr>
                <td style="padding: 0; margin: 0;">
                  <div style="background: linear-gradient(90deg, #00ab45 0%, #09bf61 50%, #00ab45 100%); height: 2px; width: 100%; line-height: 0; font-size: 0;">&nbsp;</div>
                </td>
              </tr>
              <!-- CONTEÚDO -->
              <tr>
                <td style="padding: 48px 40px;">
                  <!-- TAG SUPERIOR -->
                  <div style="margin-bottom: 32px;">
                    <table border="0" cellspacing="0" cellpadding="0">
                      <tbody>
                        <tr>
                          <td style="width: 8px; height: 8px; background-color: #00ab45;">&nbsp;</td>
                          <td style="padding-left: 12px;">
                            <span style="font-size: 11px; color: #09bf61; letter-spacing: 3px; text-transform: uppercase; font-weight: bold;">CONECTADO</span>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  <!-- TÍTULO -->
                  <div style="margin-bottom: 32px;">
                    <h1 style="font-size: 32px; color: #ffffff; margin: 0 0 12px 0; font-weight: 300; letter-spacing: -1px;">
                      Bem-vindo, <span style="color: #0aa452; font-weight: 600;">${customerName.split(' ')[0]}</span>
                    </h1>
                    <div style="width: 60px; height: 2px; background-color: #00ab45;">&nbsp;</div>
                  </div>
                  <!-- TEXTO -->
                  <div style="margin-bottom: 32px;">
                    <p style="font-size: 15px; color: #c0c0c0; line-height: 1.7; margin: 0;">
                      Sua conta foi liberada e você já pode usar todos os recursos da plataforma.
                    </p>
                  </div>
                  <!-- BOTÃO -->
                  <div style="margin: 40px 0; text-align: center;">
                    <a style="display: inline-block; background-color: transparent; color: #09bf61; font-weight: bold; font-size: 13px; padding: 14px 40px; border: 2px solid #09bf61; text-decoration: none; letter-spacing: 2px; text-transform: uppercase;" href="https://app.numero-virtual.com/">
                      [ACESSAR]
                    </a>
                  </div>
                  <!-- PRÓXIMOS PASSOS -->
                  <div style="margin-top: 48px; padding: 20px; background-color: rgba(204, 255, 0, 0.03); border-left: 2px solid #0aa452;">
                    <p style="font-size: 13px; color: #888; margin: 0; line-height: 1.6;">
                      <strong style="color: #0aa452;">PRÓXIMOS PASSOS:</strong><br />
                      Adicione saldo e comece a ativar seus números agora!
                    </p>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </td>
      </tr>
    </tbody>
  </table>
</body>
</html>
  `;

  return sendEmail({
    to: customerEmail,
    subject: "🎉 Bem-vindo ao Número Virtual!",
    html,
  });
}

/**
 * Send account activation email with verification link
 */
export async function sendActivationEmail(
  customerEmail: string,
  customerName: string,
  customerId: number
): Promise<boolean> {
  const activationUrl = `https://app.numero-virtual.com/activate?id=${customerId}`;

  // Use dynamic import to load the template renderer
  const { renderActivationEmail } = await import("./email-template-renderer.js");
  
  const html = renderActivationEmail(
    customerName,
    activationUrl,
    "24 horas"
  );

  return sendEmail({
    to: customerEmail,
    subject: "✅ Ative sua conta - Número Virtual",
    html,
  });
}

/**
 * Send account confirmation email (sent AFTER activation)
 */
export async function sendConfirmationEmail(customerEmail: string, customerName: string): Promise<boolean> {
  const html = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Conta Confirmada - Número Virtual</title>
</head>
<body style="margin: 0; padding: 0; background-color: #ffffff; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
    <div style="min-height: 100vh; background-color: #ffffff; padding: 32px;">
        <div style="max-width: 700px; margin: 0 auto;">

            <!-- Header -->
            <div style="background: linear-gradient(to right, #4ade80, #22c55e); border-radius: 16px; padding: 32px; margin-bottom: 32px;">
                <div style="display: flex; align-items: center; justify-content: center; gap: 12px;">
                    <div style="width: 48px; height: 48px; background-color: rgba(255, 255, 255, 0.2); border-radius: 8px; display: flex; align-items: center; justify-content: center;">
                        <span style="font-size: 30px;">✓</span>
                    </div>
                    <h1 style="font-size: 36px; font-weight: bold; color: #000000; margin: 0;">
                        Conta Confirmada!
                    </h1>
                </div>
            </div>

            <!-- Content -->
            <div style="padding: 0 16px;">

                <!-- Greeting -->
                <h2 style="font-size: 36px; font-weight: bold; color: #22c55e; margin-bottom: 24px;">
                    Olá, ${customerName.split(' ')[0]}!
                </h2>

                <!-- Confirmation Message -->
                <p style="font-size: 20px; color: #374151; margin-bottom: 32px; line-height: 1.5;">
                    Sua conta no <strong>Número Virtual</strong> foi confirmada com sucesso!
                </p>

                <!-- Features List -->
                <div style="margin-bottom: 40px;">
                    <p style="font-size: 20px; color: #374151; margin-bottom: 24px; font-weight: 600;">
                        Agora você pode:
                    </p>

                    <ul style="list-style: none; padding: 0; margin: 0;">
                        <li style="display: flex; align-items: flex-start; gap: 12px; margin-bottom: 16px;">
                            <div style="width: 32px; height: 32px; background-color: #22c55e; border-radius: 6px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; margin-top: 4px;">
                                <span style="color: #ffffff; font-size: 20px; font-weight: bold;">✓</span>
                            </div>
                            <span style="font-size: 18px; color: #374151; padding-top: 4px;">
                                Fazer login na plataforma
                            </span>
                        </li>

                        <li style="display: flex; align-items: flex-start; gap: 12px; margin-bottom: 16px;">
                            <div style="width: 32px; height: 32px; background-color: #22c55e; border-radius: 6px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; margin-top: 4px;">
                                <span style="color: #ffffff; font-size: 20px; font-weight: bold;">✓</span>
                            </div>
                            <span style="font-size: 18px; color: #374151; padding-top: 4px;">
                                Recarregar seu saldo
                            </span>
                        </li>

                        <li style="display: flex; align-items: flex-start; gap: 12px; margin-bottom: 16px;">
                            <div style="width: 32px; height: 32px; background-color: #22c55e; border-radius: 6px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; margin-top: 4px;">
                                <span style="color: #ffffff; font-size: 20px; font-weight: bold;">✓</span>
                            </div>
                            <span style="font-size: 18px; color: #374151; padding-top: 4px;">
                                Ativar números SMS de qualquer país
                            </span>
                        </li>

                        <li style="display: flex; align-items: flex-start; gap: 12px; margin-bottom: 16px;">
                            <div style="width: 32px; height: 32px; background-color: #22c55e; border-radius: 6px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; margin-top: 4px;">
                                <span style="color: #ffffff; font-size: 20px; font-weight: bold;">✓</span>
                            </div>
                            <span style="font-size: 18px; color: #374151; padding-top: 4px;">
                                Gerenciar suas ativações
                            </span>
                        </li>
                    </ul>
                </div>

                <!-- Login Button -->
                <div>
                    <a href="https://app.numero-virtual.com/" style="display: inline-block; background-color: #22c55e; color: #000000; font-weight: bold; font-size: 20px; padding: 16px 48px; border-radius: 12px; text-decoration: none; transition: background-color 0.3s;">
                        Fazer Login
                    </a>
                </div>

            </div>

        </div>
    </div>
</body>
</html>
  `;

  return sendEmail({
    to: customerEmail,
    subject: "✅ Sua conta foi confirmada!",
    html,
  });
}

/**
 * Send password reset email
 */
export async function sendPasswordResetEmail(
  customerEmail: string,
  customerName: string,
  resetToken: string
): Promise<boolean> {
  const resetUrl = `https://app.numero-virtual.com/reset-password?token=${resetToken}`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; background-color: #f4f4f4; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 20px auto; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    .header { background: linear-gradient(135deg, #ff4141 0%, #cc3333 100%); padding: 40px 20px; text-align: center; }
    .header h1 { color: #fff; margin: 0; font-size: 28px; font-weight: bold; }
    .content { padding: 40px 30px; }
    .content h2 { color: #cc3333; margin-top: 0; }
    .button { display: inline-block; padding: 12px 30px; background: #ff4141; color: #fff; text-decoration: none; border-radius: 5px; font-weight: bold; margin: 20px 0; }
    .alert { background: #fff3cd; border-left: 4px solid #ff4141; padding: 15px; margin: 20px 0; }
    .footer { background: #f8f8f8; padding: 20px; text-align: center; font-size: 12px; color: #666; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🔐 Recuperação de Senha</h1>
    </div>
    <div class="content">
      <h2>Olá, ${customerName}!</h2>
      <p>Recebemos uma solicitação para redefinir a senha da sua conta no <strong>Número Virtual</strong>.</p>
      <p>Clique no botão abaixo para criar uma nova senha:</p>
      <a href="${resetUrl}" class="button">Redefinir Senha</a>
      <div class="alert">
        <strong>⚠️ Atenção:</strong> Este link expira em 1 hora por motivos de segurança.
      </div>
      <p>Se você não solicitou esta alteração, ignore este email. Sua senha permanecerá inalterada.</p>
      <p><small>Link alternativo (caso o botão não funcione):<br>${resetUrl}</small></p>
    </div>
    <div class="footer">
      <p>© ${new Date().getFullYear()} Número Virtual. Todos os direitos reservados.</p>
      <p>Este é um email automático, por favor não responda.</p>
    </div>
  </div>
</body>
</html>
  `;

  return sendEmail({
    to: customerEmail,
    subject: "🔐 Recuperação de Senha - Número Virtual",
    html,
  });
}
