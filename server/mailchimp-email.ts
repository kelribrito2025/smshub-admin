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
  try {
    const apiKey = process.env.MANDRILL_API_KEY;
    const fromEmail = options.fromEmail || process.env.MAILCHIMP_FROM_EMAIL || "noreply@numero-virtual.com";
    const fromName = options.fromName || process.env.MAILCHIMP_FROM_NAME || "Número Virtual";

    if (!apiKey) {
      console.error("[Mandrill] API key not configured");
      return false;
    }

    const mandrillUrl = "https://mandrillapp.com/api/1.0/messages/send";
    
    const response = await fetch(mandrillUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
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
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("[Mandrill] Failed to send email:", error);
      return false;
    }

    const result = await response.json();
    
    // Check if email was sent successfully
    if (result[0]?.status === "sent" || result[0]?.status === "queued") {
      console.log("[Mandrill] Email sent successfully:", {
        to: options.to,
        subject: options.subject,
        status: result[0].status,
        id: result[0]._id,
      });
      return true;
    } else {
      console.error("[Mandrill] Email rejected:", result[0]);
      return false;
    }
  } catch (error) {
    console.error("[Mandrill] Error sending email:", error);
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
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; background-color: #f4f4f4; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 20px auto; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    .header { background: linear-gradient(135deg, #00ff41 0%, #00cc33 100%); padding: 40px 20px; text-align: center; }
    .header h1 { color: #000; margin: 0; font-size: 28px; font-weight: bold; }
    .content { padding: 40px 30px; }
    .content h2 { color: #00cc33; margin-top: 0; }
    .button { display: inline-block; padding: 12px 30px; background: #00ff41; color: #000; text-decoration: none; border-radius: 5px; font-weight: bold; margin: 20px 0; }
    .footer { background: #f8f8f8; padding: 20px; text-align: center; font-size: 12px; color: #666; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🎉 Bem-vindo ao Número Virtual!</h1>
    </div>
    <div class="content">
      <h2>Olá, ${customerName}!</h2>
      <p>Estamos muito felizes em ter você conosco! Sua conta foi criada com sucesso.</p>
      <p>Com o <strong>Número Virtual</strong>, você pode:</p>
      <ul>
        <li>✅ Receber SMS de verificação de qualquer serviço</li>
        <li>✅ Escolher entre centenas de países e operadoras</li>
        <li>✅ Ativar números instantaneamente</li>
        <li>✅ Recarregar saldo via PIX com confirmação automática</li>
      </ul>
      <p>Faça sua primeira recarga e comece a usar agora mesmo!</p>
      <a href="https://app.numero-virtual.com/" class="button">Explorar Serviços</a>
      <p>Se tiver alguma dúvida, nossa equipe está sempre pronta para ajudar.</p>
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
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; background-color: #f4f4f4; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 20px auto; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    .header { background: linear-gradient(135deg, #00ff41 0%, #00cc33 100%); padding: 40px 20px; text-align: center; }
    .header h1 { color: #000; margin: 0; font-size: 28px; font-weight: bold; }
    .content { padding: 40px 30px; }
    .content h2 { color: #00cc33; margin-top: 0; }
    .button { display: inline-block; padding: 12px 30px; background: #00ff41; color: #000; text-decoration: none; border-radius: 5px; font-weight: bold; margin: 20px 0; }
    .footer { background: #f8f8f8; padding: 20px; text-align: center; font-size: 12px; color: #666; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>✅ Conta Confirmada!</h1>
    </div>
    <div class="content">
      <h2>Olá, ${customerName}!</h2>
      <p>Sua conta no <strong>Número Virtual</strong> foi confirmada com sucesso!</p>
      <p>Agora você pode:</p>
      <ul>
        <li>✅ Fazer login na plataforma</li>
        <li>✅ Recarregar seu saldo</li>
        <li>✅ Ativar números SMS de qualquer país</li>
        <li>✅ Gerenciar suas ativações</li>
      </ul>
      <a href="https://app.numero-virtual.com/" class="button">Fazer Login</a>
      <p>Qualquer dúvida, estamos à disposição!</p>
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
