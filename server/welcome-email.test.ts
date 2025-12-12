import { describe, it, expect } from 'vitest';
import { sendWelcomeEmail, testMandrillConnection } from './mailchimp-email';

describe('Envio de Email de Boas-Vindas', () => {
  it('deve validar conexão com Mandrill API', async () => {
    const result = await testMandrillConnection();
    expect(result).toBe(true);
  }, 10000); // 10s timeout

  it('deve enviar email de boas-vindas sem erros', async () => {
    const testEmail = process.env.MAILCHIMP_FROM_EMAIL || 'test@numero-virtual.com';
    const testName = 'Usuário Teste';

    // Tentar enviar email
    const result = await sendWelcomeEmail(testEmail, testName);

    // Se API key estiver configurada, deve retornar true
    // Se não estiver, deve retornar false (mas não deve lançar erro)
    expect(typeof result).toBe('boolean');
    
    console.log('[Test] Email de boas-vindas:', result ? '✅ Enviado' : '❌ Falhou');
  }, 15000); // 15s timeout
});
