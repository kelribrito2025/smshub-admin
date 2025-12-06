import axios, { AxiosInstance } from 'axios';

const SMS24H_BASE_URL = 'https://api.sms24h.org/stubs/handler_api.php';

interface GetStatusByPhoneResponse {
  status: 'waiting' | 'received' | 'cancelled' | 'retry';
  code?: string;
  lastCode?: string;
}

/**
 * SMS24h Client - Specialized client for API 2 (sms24h.org)
 * 
 * This API returns invalid activationId (same as phoneNumber),
 * so we need to query SMS status using phoneNumber directly.
 */
export class SMS24hClient {
  private apiKey: string;
  private baseUrl: string;
  private client: AxiosInstance;

  constructor(apiKey: string, baseUrl: string = SMS24H_BASE_URL) {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
    this.client = axios.create({
      baseURL: baseUrl,
      timeout: 30000,
    });
  }

  /**
   * Make a request to SMS24h API
   */
  private async request(params: Record<string, any>): Promise<string> {
    const fullParams = {
      api_key: this.apiKey,
      ...params,
    };

    try {
      // Receber resposta como bytes crus (arraybuffer) para controlar encoding
      // A API SMS24h retorna em UTF-8
      const response = await this.client.get('', { 
        params: fullParams,
        responseType: 'arraybuffer'
      });
      
      // Decodificar bytes como UTF-8
      const decoder = new TextDecoder('utf-8');
      const data = decoder.decode(response.data);
      
      return data;
    } catch (error: any) {
      console.error('[SMS24h] Request error:', error.message);
      throw new Error('Serviço temporariamente indisponível. Tente novamente em alguns instantes.');
    }
  }

  /**
   * Parse SMS24h response format
   */
  private parseResponse(response: string | any): { success: boolean; data?: any; error?: string } {
    // If response is already an object (JSON), return it directly
    if (typeof response === 'object') {
      return { success: true, data: response };
    }

    // Check for error responses
    if (response.startsWith('BAD_KEY')) {
      return { success: false, error: 'Invalid API key' };
    }
    if (response.startsWith('ERROR_SQL')) {
      return { success: false, error: 'Database error' };
    }
    if (response.startsWith('BAD_ACTION')) {
      return { success: false, error: 'Invalid action' };
    }
    if (response.startsWith('NO_ACTIVATION')) {
      return { success: false, error: 'Activation not found' };
    }
    if (response.startsWith('BAD_STATUS')) {
      return { success: false, error: 'Invalid status' };
    }
    if (response.startsWith('NO_NUMBERS')) {
      return { success: false, error: 'No numbers available' };
    }
    if (response.startsWith('WRONG_ACTIVATION_ID')) {
      return { success: false, error: 'Wrong activation ID' };
    }

    // Success response
    return { success: true, data: response };
  }

  /**
   * Get SMS status by phone number
   * 
   * Since SMS24h returns activationId = phoneNumber (invalid format),
   * we use the phone number directly to query the status.
   * 
   * This method tries to get status using the phone number as ID.
   */
  async getSmsByPhone(phoneNumber: string): Promise<GetStatusByPhoneResponse | null> {
    try {
      console.log(`[SMS24h] Querying SMS for phone: ${phoneNumber}`);
      
      // Try using phone number as activation ID
      const response = await this.request({
        action: 'getStatus',
        id: phoneNumber,
      });
      
      const parsed = this.parseResponse(response);

      if (!parsed.success) {
        console.log(`[SMS24h] Error response: ${parsed.error}`);
        return null;
      }

      const data = parsed.data;

      // STATUS_WAIT_CODE - waiting for SMS
      if (data === 'STATUS_WAIT_CODE') {
        return { status: 'waiting' };
      }

      // STATUS_WAIT_RETRY:LASTCODE - waiting for another SMS
      if (data.startsWith('STATUS_WAIT_RETRY:')) {
        // Usar substring para pegar tudo após 'STATUS_WAIT_RETRY:'
        // NÃO usar split(':') porque o código pode conter ':'
        const lastCode = data.substring('STATUS_WAIT_RETRY:'.length);
        return { status: 'retry', lastCode };
      }

      // STATUS_CANCEL - activation canceled
      if (data === 'STATUS_CANCEL') {
        return { status: 'cancelled' };
      }

      // STATUS_OK:CODE - code received
      if (data.startsWith('STATUS_OK:')) {
        // Usar substring para pegar tudo após 'STATUS_OK:'
        // NÃO usar split(':') porque o código pode conter ':'
        const code = data.substring('STATUS_OK:'.length);
        console.log(`[SMS24h] SMS code received for ${phoneNumber}: ${code}`);
        return { status: 'received', code };
      }

      console.log(`[SMS24h] Unknown status format: ${data}`);
      return null;
    } catch (error: any) {
      console.error(`[SMS24h] Error querying SMS for ${phoneNumber}:`, error.message);
      return null;
    }
  }

  /**
   * Order a phone number (GetNumber)
   */
  async getNumber(
    service: string,
    country?: number,
    operator?: string
  ): Promise<{ activationId: string; phoneNumber: string }> {
    const params: Record<string, any> = {
      action: 'getNumber',
      service,
    };
    if (country) params.country = country;
    if (operator) params.operator = operator;

    const response = await this.request(params);
    console.log('[SMS24h getNumber] RAW RESPONSE:', response);
    
    const parsed = this.parseResponse(response);
    console.log('[SMS24h getNumber] PARSED:', JSON.stringify(parsed, null, 2));

    if (!parsed.success) {
      throw new Error(parsed.error || 'Failed to get number from SMS24h');
    }

    // Response format: ACCESS_NUMBER:ID:NUMBER
    // Example: ACCESS_NUMBER:234242:79123456789
    const match = parsed.data.match(/ACCESS_NUMBER:(\d+):(\d+)/);
    console.log('[SMS24h getNumber] REGEX MATCH:', match);
    
    if (!match) {
      console.error('[SMS24h getNumber] Failed to parse:', parsed.data);
      throw new Error(`Invalid getNumber response format: ${parsed.data}`);
    }

    const result = {
      activationId: match[1],
      phoneNumber: match[2],
    };
    console.log('[SMS24h getNumber] FINAL RESULT:', result);
    
    return result;
  }

  /**
   * Cancel activation by phone number
   */
  async cancelByPhone(phoneNumber: string): Promise<boolean> {
    try {
      const response = await this.request({
        action: 'setStatus',
        id: phoneNumber,
        status: 8, // Cancel status
      });
      
      const parsed = this.parseResponse(response);
      
      if (!parsed.success) {
        return false;
      }

      return parsed.data.startsWith('ACCESS_');
    } catch (error) {
      console.error(`[SMS24h] Error canceling activation for ${phoneNumber}:`, error);
      return false;
    }
  }
}
