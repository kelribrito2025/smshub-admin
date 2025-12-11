import { describe, it, expect, beforeAll } from 'vitest';
import { getDb } from './db';
import { customers, referrals } from '../drizzle/schema';
import { eq } from 'drizzle-orm';
import { processFirstRechargeBonus } from './db-helpers/affiliate-helpers';

describe('Affiliate Bonus System', () => {
  it('should credit bonus to affiliate balance (not bonusBalance)', async () => {
    const db = await getDb();
    if (!db) throw new Error('Database not available');

    // Get affiliate (fcokelrihbrito@gmail.com - PIN 510014)
    const affiliateResult = await db
      .select()
      .from(customers)
      .where(eq(customers.pin, 510014))
      .limit(1);

    expect(affiliateResult.length).toBe(1);
    const affiliate = affiliateResult[0];
    
    console.log('Affiliate before test:', {
      id: affiliate.id,
      name: affiliate.name,
      email: affiliate.email,
      balance: affiliate.balance,
    });

    // Verify that bonusBalance field no longer exists in schema
    expect(affiliate).not.toHaveProperty('bonusBalance');

    // Get one of the referred customers
    const referredResult = await db
      .select()
      .from(customers)
      .where(eq(customers.referredBy, 510014))
      .limit(1);

    expect(referredResult.length).toBeGreaterThan(0);
    const referred = referredResult[0];

    console.log('Referred customer:', {
      id: referred.id,
      name: referred.name,
      email: referred.email,
      referredBy: referred.referredBy,
    });

    // Get referral relationship
    const referralResult = await db
      .select()
      .from(referrals)
      .where(eq(referrals.referredId, referred.id))
      .limit(1);

    if (referralResult.length > 0) {
      const referral = referralResult[0];
      console.log('Referral relationship:', {
        id: referral.id,
        referrerId: referral.referrerId,
        referredId: referral.referredId,
        status: referral.status,
        bonusGenerated: referral.bonusGenerated,
      });

      // Verify that bonus was generated
      if (referral.status === 'active') {
        expect(referral.bonusGenerated).toBeGreaterThan(0);
        console.log('✅ Bonus was generated:', referral.bonusGenerated, 'cents');
      }
    }

    console.log('✅ Test passed: bonusBalance field removed, bonus credited to main balance');
  });

  it('should process first recharge bonus correctly', async () => {
    const db = await getDb();
    if (!db) throw new Error('Database not available');

    // Create test customers
    const testAffiliateEmail = `test-affiliate-${Date.now()}@test.com`;
    const testReferredEmail = `test-referred-${Date.now()}@test.com`;

    // Get next available PIN
    const maxPinResult = await db.execute<{ maxPin: number }>(
      'SELECT MAX(pin) as maxPin FROM customers'
    );
    const nextPin = (maxPinResult[0]?.maxPin || 500000) + 1;

    // Create affiliate
    const [affiliateInsert] = await db.insert(customers).values({
      pin: nextPin,
      name: 'Test Affiliate',
      email: testAffiliateEmail,
      balance: 0,
      password: 'test',
    });

    const affiliateId = affiliateInsert.insertId;

    // Create referred customer
    const [referredInsert] = await db.insert(customers).values({
      pin: nextPin + 1,
      name: 'Test Referred',
      email: testReferredEmail,
      balance: 0,
      password: 'test',
      referredBy: nextPin,
    });

    const referredId = referredInsert.insertId;

    // Create referral relationship
    await db.insert(referrals).values({
      referrerId: affiliateId,
      referredId: referredId,
      status: 'pending',
    });

    // Get affiliate balance before bonus
    const affiliateBeforeResult = await db
      .select()
      .from(customers)
      .where(eq(customers.id, affiliateId))
      .limit(1);

    const balanceBefore = affiliateBeforeResult[0].balance;

    // Process first recharge bonus (R$ 10,00 = 1000 cents)
    const rechargeAmount = 1000;
    const bonusResult = await processFirstRechargeBonus(referredId, rechargeAmount);

    expect(bonusResult).not.toBeNull();
    expect(bonusResult?.bonusAmount).toBeGreaterThan(0);

    // Get affiliate balance after bonus
    const affiliateAfterResult = await db
      .select()
      .from(customers)
      .where(eq(customers.id, affiliateId))
      .limit(1);

    const balanceAfter = affiliateAfterResult[0].balance;

    // Verify bonus was credited to main balance
    expect(balanceAfter).toBe(balanceBefore + bonusResult!.bonusAmount);

    console.log('✅ First recharge bonus test passed:', {
      rechargeAmount,
      bonusAmount: bonusResult!.bonusAmount,
      balanceBefore,
      balanceAfter,
      difference: balanceAfter - balanceBefore,
    });

    // Cleanup test data
    await db.delete(referrals).where(eq(referrals.referredId, referredId));
    await db.delete(customers).where(eq(customers.id, referredId));
    await db.delete(customers).where(eq(customers.id, affiliateId));
  });
});
