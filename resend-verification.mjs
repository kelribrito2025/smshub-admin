import mysql from 'mysql2/promise';
import Mailchimp from '@mailchimp/mailchimp_transactional';

const DATABASE_URL = process.env.DATABASE_URL;
const mailchimp = Mailchimp(process.env.MAILCHIMP_API_KEY || '');

// Generate 6-digit code
function generateCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

async function resendVerification() {
  const connection = await mysql.createConnection(DATABASE_URL);
  
  try {
    const customerId = 720001;
    const email = 'criptomoedazcore@gmail.com';
    const name = 'rrrrr';
    
    // Generate new code
    const code = generateCode();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
    
    console.log('📝 Gerando novo código de verificação...');
    console.log(`   Código: ${code}`);
    console.log(`   Expira em: ${expiresAt.toISOString()}`);
    
    // Delete old codes
    await connection.execute(
      'DELETE FROM email_verifications WHERE customerId = ?',
      [customerId]
    );
    
    // Insert new code
    await connection.execute(
      'INSERT INTO email_verifications (customerId, code, expiresAt, createdAt) VALUES (?, ?, ?, NOW())',
      [customerId, code, expiresAt]
    );
    
    console.log('✅ Código salvo no banco de dados');
    
    // Send email
    console.log('📧 Enviando email...');
    
    const message = {
      from_email: process.env.MAILCHIMP_FROM_EMAIL || 'noreply@numero-virtual.com',
      from_name: process.env.MAILCHIMP_FROM_NAME || 'Número Virtual',
      subject: 'Verifique seu email - Número Virtual',
      to: [{ email, type: 'to' }],
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
            
            <p>Olá ${name},</p>
            
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
    
    const response = await mailchimp.messages.send({ message });
    const result = Array.isArray(response) ? response[0] : null;
    
    console.log('✅ Email enviado com sucesso!');
    console.log(`   Status: ${result?.status}`);
    console.log(`   Message ID: ${result?._id}`);
    console.log(`   Reject reason: ${result?.reject_reason || 'none'}`);
    
  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    await connection.end();
  }
}

resendVerification().catch(console.error);
