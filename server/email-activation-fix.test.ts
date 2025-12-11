import { describe, it, expect } from 'vitest';
import { sendActivationEmail } from './mailchimp-email';
import { createCustomer, getCustomerByEmail } from './customers-helpers';
import bcrypt from 'bcrypt';

describe('Correção: Envio de Email de Ativação', () => {
  it('deve enviar email de ativação sem erro de __dirname', async () => {
    // Criar usuário de teste
    const email = `test-email-fix-${Date.now()}@example.com`;
    const password = await bcrypt.hash('testpassword123', 10);

    const customer = await createCustomer({
      email,
      name: 'Test User Email Fix',
      password,
      emailVerified: false,
    });

    expect(customer).toBeDefined();
    expect(customer.emailVerified).toBe(false);

    // Tentar enviar email de ativação
    // Nota: Vai falhar com "global-block" porque é email de teste,
    // mas NÃO deve dar erro de __dirname
    try {
      const result = await sendActivationEmail(customer.email, customer.name, customer.id);
      
      // Se chegou aqui, a função executou sem erro de __dirname
      console.log('[Test] ✅ sendActivationEmail executou sem erro de __dirname');
      
      // Resultado pode ser false devido a global-block, mas isso é esperado
      expect(typeof result).toBe('boolean');
    } catch (error: any) {
      // Se der erro, NÃO deve ser de __dirname
      expect(error.message).not.toContain('__dirname');
      expect(error.message).not.toContain('is not defined');
      
      console.log('[Test] ✅ Erro não relacionado a __dirname:', error.message);
    }
  });

  it('deve renderizar template de email corretamente', async () => {
    // Importar renderActivationEmail
    const { renderActivationEmail } = await import('./email-template-renderer');
    
    // Tentar renderizar template
    const html = renderActivationEmail(
      'Test User',
      'https://app.numero-virtual.com/activate?id=12345',
      '24 horas'
    );

    // Verificar que o HTML foi gerado
    expect(html).toBeDefined();
    expect(html.length).toBeGreaterThan(0);
    expect(html).toContain('Test User');
    expect(html).toContain('https://app.numero-virtual.com/activate?id=12345');
    expect(html).toContain('24 horas');
    
    console.log('[Test] ✅ Template de email renderizado com sucesso');
  });
});
