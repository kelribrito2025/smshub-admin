import { describe, it, expect } from 'vitest';
import { getDb } from './db';
import { balanceTransactions, customers } from '../drizzle/schema';
import { eq, and, like } from 'drizzle-orm';

describe('Affiliate Bonus Display in Timeline', () => {
  it('should identify affiliate bonus transactions correctly', async () => {
    const db = await getDb();
    if (!db) throw new Error('Database not available');

    // Buscar transações de bônus de afiliados
    const bonusTransactions = await db
      .select({
        id: balanceTransactions.id,
        customerId: balanceTransactions.customerId,
        amount: balanceTransactions.amount,
        type: balanceTransactions.type,
        origin: balanceTransactions.origin,
        description: balanceTransactions.description,
        metadata: balanceTransactions.metadata,
      })
      .from(balanceTransactions)
      .where(
        and(
          eq(balanceTransactions.type, 'credit'),
          eq(balanceTransactions.origin, 'system'),
          like(balanceTransactions.metadata, '%referralId%')
        )
      )
      .limit(5);

    console.log(`\n✅ Found ${bonusTransactions.length} affiliate bonus transactions`);

    // Validar que encontramos pelo menos uma transação de bônus
    expect(bonusTransactions.length).toBeGreaterThan(0);

    // Validar estrutura de cada transação de bônus
    for (const transaction of bonusTransactions) {
      // Validar tipo e origem
      expect(transaction.type).toBe('credit');
      expect(transaction.origin).toBe('system');

      // Validar metadata
      expect(transaction.metadata).toBeTruthy();
      const metadata = JSON.parse(transaction.metadata!);
      
      // Validar campos obrigatórios no metadata
      expect(metadata).toHaveProperty('referralId');
      expect(metadata).toHaveProperty('bonusAmount');
      expect(metadata).toHaveProperty('referredCustomerId');
      expect(metadata).toHaveProperty('rechargeAmount');
      expect(metadata).toHaveProperty('bonusPercentage');

      // Validar que o valor da transação corresponde ao bonusAmount
      expect(transaction.amount).toBe(metadata.bonusAmount);

      // Validar descrição
      expect(transaction.description).toContain('Bônus de afiliado');
      expect(transaction.description).toContain(`Cliente #${metadata.referredCustomerId}`);

      console.log(`  ✓ Transaction #${transaction.id}: R$ ${(transaction.amount / 100).toFixed(2)} bonus for customer #${transaction.customerId}`);
    }
  });

  it('should verify bonus transactions are linked to valid customers', async () => {
    const db = await getDb();
    if (!db) throw new Error('Database not available');

    // Buscar uma transação de bônus com informações do cliente
    const bonusWithCustomer = await db
      .select({
        transactionId: balanceTransactions.id,
        customerId: balanceTransactions.customerId,
        amount: balanceTransactions.amount,
        metadata: balanceTransactions.metadata,
        customerName: customers.name,
        customerEmail: customers.email,
        customerBalance: customers.balance,
      })
      .from(balanceTransactions)
      .leftJoin(customers, eq(balanceTransactions.customerId, customers.id))
      .where(
        and(
          eq(balanceTransactions.type, 'credit'),
          eq(balanceTransactions.origin, 'system'),
          like(balanceTransactions.metadata, '%referralId%')
        )
      )
      .limit(1);

    expect(bonusWithCustomer.length).toBeGreaterThan(0);

    const result = bonusWithCustomer[0];
    
    // Validar que a transação existe e tem customerId
    expect(result.transactionId).toBeTruthy();
    expect(result.customerId).toBeTruthy();
    expect(result.amount).toBeGreaterThan(0);

    console.log(`\n✅ Bonus transaction #${result.transactionId} linked to customer #${result.customerId}`);
    console.log(`   Amount: R$ ${(result.amount / 100).toFixed(2)}`);
    if (result.customerName) {
      console.log(`   Customer: ${result.customerName} (${result.customerEmail})`);
    }
  });

  it('should validate metadata structure for frontend display', async () => {
    const db = await getDb();
    if (!db) throw new Error('Database not available');

    // Buscar uma transação de bônus
    const bonusTransaction = await db
      .select()
      .from(balanceTransactions)
      .where(
        and(
          eq(balanceTransactions.type, 'credit'),
          eq(balanceTransactions.origin, 'system'),
          like(balanceTransactions.metadata, '%referralId%')
        )
      )
      .limit(1);

    expect(bonusTransaction.length).toBeGreaterThan(0);

    const transaction = bonusTransaction[0];
    const metadata = JSON.parse(transaction.metadata!);

    // Simular a função isAffiliateBonus do frontend
    const isAffiliateBonus = (t: any): boolean => {
      if (t.type !== 'credit' || t.origin !== 'system') return false;
      try {
        const meta = t.metadata ? JSON.parse(t.metadata) : null;
        return !!(meta && meta.referralId && meta.bonusAmount);
      } catch {
        return false;
      }
    };

    // Validar que a função identifica corretamente
    const isBonus = isAffiliateBonus(transaction);
    expect(isBonus).toBe(true);

    console.log(`\n✅ Frontend detection function works correctly`);
    console.log(`   Transaction #${transaction.id} is correctly identified as affiliate bonus`);
    console.log(`   Metadata:`, JSON.stringify(metadata, null, 2));
  });
});
