import { describe, it, expect } from 'vitest';
import { appRouter } from './routers';

describe('Affiliate URL Test', () => {
  it('should generate referral link with correct domain', async () => {
    const caller = appRouter.createCaller({ user: null });
    
    // Test with a valid customer ID
    // Note: This test assumes customer 510014 exists in the database
    const result = await caller.affiliate.getReferralLink({ customerId: 510014 });
    
    // Verify the link uses the correct domain
    expect(result.referralLink).toContain('app.numero-virtual.com');
    expect(result.referralLink).toContain('/?ref=510014');
    expect(result.referralLink).toBe('https://app.numero-virtual.com/?ref=510014');
    
    console.log('✅ Referral link generated correctly:', result.referralLink);
  });
});
