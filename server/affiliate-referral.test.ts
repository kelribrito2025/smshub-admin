import { describe, it, expect } from 'vitest';
import { createCustomer, getCustomerByEmail, getCustomerByPin } from './customers-helpers';
import { getReferralsByAffiliate } from './db-helpers/affiliate-helpers';

describe('Sistema de Afiliados - Registro de Indicações', () => {
  it('deve registrar indicação quando novo usuário se cadastra com referralPin', async () => {
    // 1. Criar afiliado (indicador)
    const affiliateEmail = `affiliate-${Date.now()}@example.com`;
    const affiliate = await createCustomer({
      name: 'Afiliado Teste',
      email: affiliateEmail,
      balance: 0,
    });

    console.log(`[Test] Afiliado criado: ID=${affiliate.id}, PIN=${affiliate.pin}`);

    // 2. Simular registro de novo usuário com referralPin
    const referredEmail = `referred-${Date.now()}@example.com`;
    const referred = await createCustomer({
      name: 'Indicado Teste',
      email: referredEmail,
      balance: 0,
      referredBy: affiliate.id, // ✅ Salvar ID do afiliado
    });

    console.log(`[Test] Indicado criado: ID=${referred.id}, referredBy=${referred.referredBy}`);

    // 3. Verificar se referredBy foi salvo corretamente
    expect(referred.referredBy).toBe(affiliate.id);

    // 4. Verificar se indicação aparece no painel do afiliado
    const referrals = await getReferralsByAffiliate(affiliate.id);
    console.log(`[Test] Indicações do afiliado:`, referrals);

    expect(referrals.length).toBeGreaterThan(0);
    
    const referral = referrals.find(r => r.referredId === referred.id);
    expect(referral).toBeDefined();
    expect(referral?.referredEmail).toBe(referredEmail);
    expect(referral?.status).toBe('pending'); // Ainda não fez recarga
  });

  it('deve converter PIN para customerId corretamente', async () => {
    // 1. Criar afiliado
    const affiliateEmail = `affiliate-pin-${Date.now()}@example.com`;
    const affiliate = await createCustomer({
      name: 'Afiliado PIN Teste',
      email: affiliateEmail,
      balance: 0,
    });

    console.log(`[Test] Afiliado criado: ID=${affiliate.id}, PIN=${affiliate.pin}`);

    // 2. Buscar afiliado pelo PIN (simular conversão do backend)
    const foundByPin = await getCustomerByPin(affiliate.pin);
    
    expect(foundByPin).toBeDefined();
    expect(foundByPin?.id).toBe(affiliate.id);
    expect(foundByPin?.pin).toBe(affiliate.pin);

    console.log(`[Test] Conversão PIN → ID bem-sucedida: PIN ${affiliate.pin} → ID ${foundByPin?.id}`);
  });

  it('deve ignorar referralPin inválido sem quebrar registro', async () => {
    // Tentar criar usuário com PIN inválido (999999)
    const email = `no-referral-${Date.now()}@example.com`;
    const customer = await createCustomer({
      name: 'Sem Indicação',
      email,
      balance: 0,
      referredBy: undefined, // Simular PIN inválido → referredBy = undefined
    });

    expect(customer).toBeDefined();
    expect(customer.referredBy).toBeNull();
    
    console.log(`[Test] Usuário criado sem indicação: ID=${customer.id}, referredBy=${customer.referredBy}`);
  });
});
