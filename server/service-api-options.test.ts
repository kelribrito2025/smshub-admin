import { describe, it, expect } from 'vitest';
import { getServiceApiOptions } from './service-api-options-helper';

describe('getServiceApiOptions', () => {
  it('should return multiple API options for WhatsApp in Brazil', async () => {
    // WhatsApp serviceId = 60001 (from database)
    // Brazil countryId = 1
    const options = await getServiceApiOptions(60001, 1);
    
    console.log('[TEST] Total options returned:', options.length);
    console.log('[TEST] Options:', JSON.stringify(options, null, 2));
    
    // Should have at least 2 options (Opção 1 and Opção 2)
    expect(options.length).toBeGreaterThanOrEqual(2);
    
    // Verify each option has required fields
    options.forEach((option, index) => {
      console.log(`[TEST] Option ${index + 1}:`, option.apiName, '-', option.price, 'cents');
      expect(option.apiId).toBeDefined();
      expect(option.apiName).toBeDefined();
      expect(option.price).toBeGreaterThan(0);
      expect(option.available).toBeGreaterThan(0);
    });
  });
});
