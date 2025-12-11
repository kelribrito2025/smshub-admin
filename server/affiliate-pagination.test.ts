import { describe, it, expect, beforeAll } from 'vitest';
import { createCustomer, getCustomerByEmail } from './customers-helpers';
import { getReferralsByAffiliate, getReferralsCountByAffiliate } from './db-helpers/affiliate-helpers';

describe('Sistema de Afiliados - Paginação de Indicações', () => {
  let affiliateId: number;

  beforeAll(async () => {
    // Criar afiliado de teste
    const affiliateEmail = `affiliate-pagination-${Date.now()}@test.com`;
    const affiliate = await createCustomer({
      name: 'Afiliado Teste Paginação',
      email: affiliateEmail,
      password: 'test123',
      phone: '+5511999999999',
    });
    affiliateId = affiliate.id;

    // Criar 20 indicações de teste
    for (let i = 1; i <= 20; i++) {
      await createCustomer({
        name: `Indicado ${i}`,
        email: `indicado-${i}-${Date.now()}@test.com`,
        password: 'test123',
        phone: `+551199999${String(i).padStart(4, '0')}`,
        referredBy: affiliateId,
      });
    }
  });

  it('deve retornar contagem total de indicações', async () => {
    const count = await getReferralsCountByAffiliate(affiliateId);
    expect(count).toBeGreaterThanOrEqual(20);
  });

  it('deve retornar primeira página com 13 indicações', async () => {
    const referrals = await getReferralsByAffiliate(affiliateId, {
      limit: 13,
      offset: 0,
    });
    
    expect(referrals).toBeDefined();
    expect(referrals.length).toBe(13);
  });

  it('deve retornar segunda página com indicações restantes', async () => {
    const referrals = await getReferralsByAffiliate(affiliateId, {
      limit: 13,
      offset: 13,
    });
    
    expect(referrals).toBeDefined();
    expect(referrals.length).toBeGreaterThan(0);
    expect(referrals.length).toBeLessThanOrEqual(13);
  });

  it('deve retornar indicações em ordem decrescente de criação', async () => {
    const referrals = await getReferralsByAffiliate(affiliateId, {
      limit: 5,
      offset: 0,
    });
    
    expect(referrals.length).toBe(5);
    
    // Verificar que as datas estão em ordem decrescente
    for (let i = 0; i < referrals.length - 1; i++) {
      const current = new Date(referrals[i].createdAt).getTime();
      const next = new Date(referrals[i + 1].createdAt).getTime();
      expect(current).toBeGreaterThanOrEqual(next);
    }
  });

  it('deve retornar todas as indicações quando não especificar limit/offset', async () => {
    const allReferrals = await getReferralsByAffiliate(affiliateId);
    const count = await getReferralsCountByAffiliate(affiliateId);
    
    expect(allReferrals.length).toBe(count);
  });

  it('deve retornar array vazio quando offset for maior que total', async () => {
    const referrals = await getReferralsByAffiliate(affiliateId, {
      limit: 13,
      offset: 1000,
    });
    
    expect(referrals).toBeDefined();
    expect(referrals.length).toBe(0);
  });
});
