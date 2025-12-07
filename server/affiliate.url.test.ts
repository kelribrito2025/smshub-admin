import { describe, it, expect } from 'vitest';
import { appRouter } from './routers';

describe('Affiliate URL Test', () => {
  it('should generate referral link with correct domain', async () => {
    const caller = appRouter.createCaller({ user: null });
    
    // Test with a valid customer ID (180002 from the screenshot)
    const result = await caller.affiliate.getReferralLink({ customerId: 180002 });
    
    // Verify the link uses the correct domain
    expect(result.referralLink).toContain('app.numero-virtual.com');
    expect(result.referralLink).toContain('/store?ref=180002');
    expect(result.referralLink).toBe('https://app.numero-virtual.com/store?ref=180002');
    
    console.log('✅ Referral link generated correctly:', result.referralLink);
  });
});
