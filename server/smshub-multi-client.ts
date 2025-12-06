import { SMSHubClient } from './smshub-client';
import { getActiveApis } from './apis-helpers';
import { getSetting } from './db-helpers';

/**
 * Multi-API client with automatic fallback
 * Tries each active API in priority order until one succeeds
 */
export class SMSHubMultiClient {
  /**
   * Get a working SMSHub client by trying active APIs in order
   */
  private static async getWorkingClient(): Promise<SMSHubClient | null> {
    // First, try to get APIs from sms_apis table
    const apis = await getActiveApis();
    
    if (apis.length > 0) {
      // Try each API in priority order
      for (const api of apis) {
        try {
          const client = new SMSHubClient(api.token, api.url);
          // Test the API by getting balance
          await client.getBalance();
          console.log(`[SMSHubMultiClient] Using API: ${api.name} (${api.url})`);
          return client;
        } catch (error) {
          console.warn(`[SMSHubMultiClient] API ${api.name} failed, trying next...`, error);
          continue;
        }
      }
    }
    
    // Fallback: try legacy API key from settings
    const apiKeySetting = await getSetting('smshub_api_key');
    if (apiKeySetting?.value) {
      try {
        const client = new SMSHubClient(apiKeySetting.value);
        await client.getBalance();
        console.log('[SMSHubMultiClient] Using legacy API key from settings');
        return client;
      } catch (error) {
        console.error('[SMSHubMultiClient] Legacy API key also failed', error);
      }
    }
    
    return null;
  }

  /**
   * Execute an operation with automatic fallback
   */
  private static async executeWithFallback<T>(
    operation: (client: SMSHubClient) => Promise<T>
  ): Promise<T> {
    const client = await this.getWorkingClient();
    
    if (!client) {
      throw new Error('No working SMS API available. Please configure at least one active API.');
    }
    
    return await operation(client);
  }

  // Public methods that use fallback system
  
  static async getBalance() {
    return await this.executeWithFallback(client => client.getBalance());
  }

  static async getPrices() {
    return await this.executeWithFallback(client => client.getPrices());
  }

  static async getNumbersStatus(country?: number, operator?: string) {
    return await this.executeWithFallback(client => client.getNumbersStatus(country, operator));
  }

  static async getNumber(service: string, country: number, operator?: string) {
    return await this.executeWithFallback(client => client.getNumber(service, country, operator));
  }

  static async setStatus(activationId: string, status: 1 | 3 | 6 | 8) {
    return await this.executeWithFallback(client => client.setStatus(activationId, status));
  }

  static async getStatus(activationId: string) {
    return await this.executeWithFallback(client => client.getStatus(activationId));
  }
}
