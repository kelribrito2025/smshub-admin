import Mailchimp from '@mailchimp/mailchimp_transactional';

const mailchimp = Mailchimp(process.env.MAILCHIMP_API_KEY || '');

interface SendVerificationEmailParams {
  email: string;
  code: string;
  customerName?: string;
}

export async function sendVerificationEmail({ 
  email, 
  code, 
  customerName 
}: SendVerificationEmailParams) {
  const message = {
    from_email: process.env.MAILCHIMP_FROM_EMAIL || 'noreply@smshubadm-sokyccse.manus.space',
    from_name: process.env.MAILCHIMP_FROM_NAME || 'Número Virtual',
    subject: 'Verifique seu email - Número Virtual',
    to: [{ email, type: 'to' as const }],
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { 
            font-family: 'Courier New', monospace; 
            background: #000; 
            color: #00ff41; 
            margin: 0;
            padding: 0;
          }
          .container { 
            max-width: 600px; 
            margin: 0 auto; 
            padding: 40px 20px; 
          }
          .header { 
            text-align: center; 
            margin-bottom: 40px; 
          }
          .logo { 
            width: 64px;
            height: 64px;
            background: #00D26A;
            border-radius: 12px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            font-size: 48px;
            font-weight: bold;
            color: #000;
            margin-bottom: 20px;
          }
          h1 {
            color: #00D26A;
            font-size: 28px;
            margin: 0;
          }
          .code-box { 
            background: #001a00; 
            border: 2px solid #00D26A; 
            border-radius: 8px; 
            padding: 30px; 
            text-align: center; 
            margin: 30px 0; 
          }
          .code { 
            font-size: 36px; 
            font-weight: bold; 
            letter-spacing: 8px; 
            color: #00ff41; 
          }
          p {
            line-height: 1.6;
            margin: 16px 0;
          }
          .footer { 
            text-align: center; 
            font-size: 12px; 
            color: #00ff41; 
            opacity: 0.6; 
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #00D26A;
          }
          strong {
            color: #00D26A;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">N</div>
            <h1>Número Virtual</h1>
          </div>
          
          <p>Olá${customerName ? ` ${customerName}` : ''},</p>
          
          <p>Bem-vindo ao Número Virtual! Para ativar sua conta, use o código de verificação abaixo:</p>
          
          <div class="code-box">
            <div class="code">${code}</div>
          </div>
          
          <p><strong>Este código expira em 15 minutos.</strong></p>
          
          <p>Se você não criou esta conta, ignore este email.</p>
          
          <div class="footer">
            <p>© ${new Date().getFullYear()} Número Virtual - Todos os direitos reservados</p>
          </div>
        </div>
      </body>
      </html>
    `,
  };

  try {
    const response = await mailchimp.messages.send({ message });
    const result = Array.isArray(response) ? response[0] : null;
    console.log('[Email] Verification code sent:', { email, status: result?.status });
    return { success: true, messageId: result?._id || 'unknown' };
  } catch (error) {
    console.error('[Email] Failed to send verification code:', error);
    throw new Error('Falha ao enviar email de verificação');
  }
}
