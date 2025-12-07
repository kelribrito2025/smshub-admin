import { describe, it, expect } from 'vitest';

/**
 * Test to validate AWESOMEAPI_TOKEN environment variable
 * This test ensures the token is correctly set and can access the API
 */
describe('AwesomeAPI Token Validation', () => {
  it('should have AWESOMEAPI_TOKEN environment variable set', () => {
    expect(process.env.AWESOMEAPI_TOKEN).toBeDefined();
    expect(process.env.AWESOMEAPI_TOKEN).not.toBe('');
    expect(process.env.AWESOMEAPI_TOKEN?.length).toBeGreaterThan(10);
  });

  it('should successfully fetch USD/BRL rate with token', async () => {
    const token = process.env.AWESOMEAPI_TOKEN;
    const url = `https://economia.awesomeapi.com.br/json/last/USD-BRL?token=${token}`;
    
    const response = await fetch(url);
    
    expect(response.ok).toBe(true);
    expect(response.status).toBe(200);
    
    const data = await response.json();
    
    expect(data).toHaveProperty('USDBRL');
    expect(data.USDBRL).toHaveProperty('bid');
    expect(data.USDBRL).toHaveProperty('ask');
    expect(data.USDBRL).toHaveProperty('create_date');
    
    const rate = parseFloat(data.USDBRL.bid);
    expect(rate).toBeGreaterThan(0);
    expect(rate).toBeLessThan(20); // Reasonable upper bound
    
    console.log(`[Test] AwesomeAPI rate: R$ ${rate} (${data.USDBRL.create_date})`);
  }, 10000); // 10s timeout for API call

  it('should return valid exchange rate format', async () => {
    const token = process.env.AWESOMEAPI_TOKEN;
    const url = `https://economia.awesomeapi.com.br/json/last/USD-BRL?token=${token}`;
    
    const response = await fetch(url);
    const data = await response.json();
    const rate = parseFloat(data.USDBRL.bid);
    
    // Should have at most 4 decimal places
    const decimals = (rate.toString().split('.')[1] || '').length;
    expect(decimals).toBeLessThanOrEqual(4);
  }, 10000);
});
