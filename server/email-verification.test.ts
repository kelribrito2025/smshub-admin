import { describe, it, expect } from 'vitest';
import { generateVerificationCode } from './db';
import { sendVerificationEmail } from './email';

describe('Email Verification Integration', () => {
  it('should generate 6-digit verification code', () => {
    const code = generateVerificationCode();
    expect(code).toHaveLength(6);
    expect(code).toMatch(/^\d{6}$/);
    expect(parseInt(code)).toBeGreaterThanOrEqual(100000);
    expect(parseInt(code)).toBeLessThanOrEqual(999999);
  });

  it('should validate Mailchimp API credentials by sending test email', async () => {
    // Test email sending with Mailchimp API
    // This validates that the API key is correct and working
    const testEmail = process.env.MAILCHIMP_FROM_EMAIL || 'test@example.com';
    
    try {
      const result = await sendVerificationEmail({
        email: testEmail, // Send to same FROM email to avoid spam
        code: '123456',
        customerName: 'Test User',
      });

      expect(result.success).toBe(true);
      expect(result.messageId).toBeDefined();
      console.log('[Test] Mailchimp API validation successful:', result);
    } catch (error) {
      // If error occurs, it means credentials are invalid
      console.error('[Test] Mailchimp API validation failed:', error);
      throw new Error('Mailchimp API credentials are invalid. Please check MAILCHIMP_API_KEY.');
    }
  }, 30000); // 30s timeout for API call
});
