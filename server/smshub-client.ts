import axios, { AxiosInstance } from 'axios';
import { eq } from 'drizzle-orm';
import { getDb } from './db';
import { apiLogs, settings } from '../drizzle/schema';

const SMSHUB_BASE_URL = 'https://smshub.org/stubs/handler_api.php';

interface SMSHubResponse {
  success: boolean;
  data?: any;
  error?: string;
}

interface GetNumberResponse {
  activationId: string;
  phoneNumber: string;
}

interface GetStatusResponse {
  status: 'waiting' | 'received' | 'cancelled' | 'retry';
  code?: string;
  lastCode?: string;
}

interface GetBalanceResponse {
  balance: number;
}

interface GetPricesResponse {
  [country: string]: {
    [service: string]: {
      [price: string]: number; // price: quantity
    };
  };
}

interface GetNumbersStatusResponse {
  [serviceKey: string]: number; // service_operator: quantity
}

export class SMSHubClient {
  private apiKey: string;
  private baseUrl: string;
  private client: AxiosInstance;
  private rateLimitErrors: number = 0;
  private lastRateLimitError: Date | null = null;
  private backoffDelay: number = 0;

  constructor(apiKey: string, baseUrl: string = SMSHUB_BASE_URL) {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
    this.client = axios.create({
      baseURL: baseUrl,
      timeout: 30000,
    });
  }

  /**
   * Log API request and response to database
   */
  private async logRequest(
    action: string,
    requestParams: Record<string, any>,
    response: any,
    success: boolean,
    errorMessage?: string
  ): Promise<void> {
    try {
      const db = await getDb();
      if (!db) return;

      await db.insert(apiLogs).values({
        endpoint: this.baseUrl,
        action,
        requestParams: JSON.stringify(requestParams),
        response: JSON.stringify(response),
        statusCode: response?.status || 0,
        success,
        errorMessage: errorMessage || null,
      });
    } catch (error) {
      console.error('[SMSHub] Failed to log request:', error);
    }
  }

  /**
   * Handle rate limit errors with exponential backoff
   */
  private handleRateLimitError(error: string): void {
    this.rateLimitErrors++;
    this.lastRateLimitError = new Date();
    
    // Exponential backoff: 2s, 4s, 8s, 16s, max 30s
    this.backoffDelay = Math.min(Math.pow(2, this.rateLimitErrors) * 1000, 30000);
    
    console.error(`[SMSHub RATE LIMIT] Error detected: ${error}`);
    console.error(`[SMSHub RATE LIMIT] Consecutive errors: ${this.rateLimitErrors}`);
    console.error(`[SMSHub RATE LIMIT] Backoff delay: ${this.backoffDelay}ms`);
    console.error(`[SMSHub RATE LIMIT] Timestamp: ${this.lastRateLimitError.toISOString()}`);
  }

  /**
   * Reset rate limit counter after successful request
   */
  private resetRateLimitCounter(): void {
    if (this.rateLimitErrors > 0) {
      console.log(`[SMSHub RATE LIMIT] Reset counter after ${this.rateLimitErrors} consecutive errors`);
      this.rateLimitErrors = 0;
      this.backoffDelay = 0;
    }
  }

  /**
   * Make a request to SMSHub API
   */
  private async request(params: Record<string, any>): Promise<string> {
    // Apply backoff delay if we hit rate limit recently
    if (this.backoffDelay > 0) {
      console.log(`[SMSHub RATE LIMIT] Applying backoff delay: ${this.backoffDelay}ms`);
      await new Promise(resolve => setTimeout(resolve, this.backoffDelay));
    }
    const fullParams = {
      api_key: this.apiKey,
      ...params,
    };

    try {
      // Receber resposta como bytes crus (arraybuffer) para controlar encoding
      // A API SMSHub retorna em UTF-8
      const response = await this.client.get('', { 
        params: fullParams,
        responseType: 'arraybuffer'
      });
      
      // Decodificar bytes como UTF-8
      const decoder = new TextDecoder('utf-8');
      const data = decoder.decode(response.data);

      await this.logRequest(params.action, fullParams, data, true);
      
      // Reset rate limit counter on successful request
      this.resetRateLimitCounter();

      return data;
    } catch (error: any) {
      const errorMessage = error.response?.data || error.message;
      await this.logRequest(params.action, fullParams, errorMessage, false, errorMessage);
      // Mensagem amigável para cliente final (sem mencionar fornecedor)
      throw new Error('Serviço temporariamente indisponível. Tente novamente em alguns instantes.');
    }
  }

  /**
   * Parse SMSHub response format
   */
  private parseResponse(response: string | any): { success: boolean; data?: any; error?: string } {
    // If response is already an object (JSON), return it directly
    if (typeof response === 'object') {
      return { success: true, data: response };
    }

    // Handle string responses
    const responseStr = String(response);
    
    // Handle error responses
    if (responseStr.startsWith('BAD_')) {
      // Check for rate limit errors
      if (responseStr === 'BAD_ACTION' || responseStr.includes('TOO_MANY')) {
        this.handleRateLimitError(responseStr);
      }
      return { success: false, error: responseStr };
    }
    if (responseStr.startsWith('NO_')) {
      return { success: false, error: responseStr };
    }
    if (responseStr.startsWith('ERROR_')) {
      return { success: false, error: responseStr };
    }
    if (responseStr.startsWith('WRONG_')) {
      return { success: false, error: responseStr };
    }
    if (responseStr.includes('TOO_MANY_REQUESTS')) {
      this.handleRateLimitError(responseStr);
      return { success: false, error: responseStr };
    }

    return { success: true, data: responseStr };
  }

  /**
   * Get account balance
   */
  async getBalance(): Promise<GetBalanceResponse> {
    const response = await this.request({ action: 'getBalance' });
    const parsed = this.parseResponse(response);

    if (!parsed.success) {
      throw new Error(parsed.error);
    }

    // Response format: ACCESS_BALANCE:540
    const match = parsed.data.match(/ACCESS_BALANCE:(\d+\.?\d*)/);
    if (!match) {
      throw new Error('Invalid balance response format');
    }

    return {
      balance: parseFloat(match[1]),
    };
  }

  /**
   * Get available numbers status
   */
  async getNumbersStatus(country?: number, operator?: string): Promise<GetNumbersStatusResponse> {
    const params: Record<string, any> = { action: 'getNumbersStatus' };
    if (country) params.country = country;
    if (operator) params.operator = operator;

    const response = await this.request(params);
    const parsed = this.parseResponse(response);

    if (!parsed.success) {
      throw new Error(parsed.error);
    }

    // If data is already an object, return it directly
    if (typeof parsed.data === 'object') {
      return parsed.data;
    }

    // Otherwise, try to parse as JSON
    try {
      return JSON.parse(parsed.data);
    } catch (error) {
      throw new Error('Invalid JSON response from getNumbersStatus');
    }
  }

  /**
   * Get all prices
   */
  async getPrices(service?: string, country?: number): Promise<GetPricesResponse> {
    const params: Record<string, any> = { action: 'getPrices' };
    if (service) params.service = service;
    if (country) params.country = country;

    const response = await this.request(params);
    const parsed = this.parseResponse(response);

    if (!parsed.success) {
      throw new Error(parsed.error);
    }

    // If data is already an object, return it directly
    if (typeof parsed.data === 'object') {
      return parsed.data;
    }

    // Otherwise, try to parse as JSON
    try {
      return JSON.parse(parsed.data);
    } catch (error) {
      throw new Error('Invalid JSON response from getPrices');
    }
  }

  /**
   * Order a phone number
   */
  async getNumber(
    service: string,
    country?: number,
    operator?: string,
    maxPrice?: number
  ): Promise<GetNumberResponse> {
    const params: Record<string, any> = {
      action: 'getNumber',
      service,
    };
    if (country) params.country = country;
    if (operator) params.operator = operator;
    if (maxPrice) params.maxPrice = maxPrice;

    const response = await this.request(params);
    console.error('[SMSHub getNumber] ===== RAW HTTP RESPONSE =====');
    console.error(response);
    console.error('[SMSHub getNumber] ===== END RAW RESPONSE =====');
    
    const parsed = this.parseResponse(response);
    console.log('[SMSHub getNumber] PARSED RESPONSE:', JSON.stringify(parsed, null, 2));

    if (!parsed.success) {
      throw new Error(parsed.error);
    }

    console.log('[SMSHub getNumber] Parsed data:', parsed.data);

    // Response format: ACCESS_NUMBER:234242:447895814017
    const match = parsed.data.match(/ACCESS_NUMBER:(\d+):(\d+)/);
    console.log('[SMSHub getNumber] REGEX MATCH RESULT:', match);
    
    if (!match) {
      console.error('[SMSHub getNumber] Failed to parse response:', parsed.data);
      throw new Error(`Invalid getNumber response format: ${parsed.data}`);
    }

    const result = {
      activationId: match[1],
      phoneNumber: match[2],
    };
    console.log('[SMSHub getNumber] FINAL RESULT:', result);
    
    return result;
  }

  /**
   * Set activation status
   * Status codes:
   * 1 - SMS sent to the number
   * 3 - SMS needs to be repeated
   * 6 - activation completed successfully
   * 8 - cancel activation
   */
  async setStatus(activationId: string, status: 1 | 3 | 6 | 8): Promise<boolean> {
    const response = await this.request({
      action: 'setStatus',
      id: activationId,
      status,
    });
    const parsed = this.parseResponse(response);

    if (!parsed.success) {
      throw new Error(parsed.error);
    }

    // Valid responses: ACCESS_READY, ACCESS_RETRY_GET, ACCESS_ACTIVATION, ACCESS_CANCEL
    return parsed.data.startsWith('ACCESS_');
  }

  /**
   * Get activation status and SMS code
   */
  async getStatus(activationId: string): Promise<GetStatusResponse> {
    const response = await this.request({
      action: 'getStatus',
      id: activationId,
    });
    const parsed = this.parseResponse(response);

    if (!parsed.success) {
      throw new Error(parsed.error);
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
      return { status: 'received', code };
    }

    throw new Error('Unknown status response format');
  }

  /**
   * Cancel activation
   */
  async cancelActivation(activationId: string): Promise<boolean> {
    return this.setStatus(activationId, 8);
  }

  /**
   * Complete activation
   */
  async completeActivation(activationId: string): Promise<boolean> {
    return this.setStatus(activationId, 6);
  }

  /**
   * Request another SMS
   */
  async requestAnotherSMS(activationId: string): Promise<boolean> {
    return this.setStatus(activationId, 3);
  }
}

/**
 * Get SMSHub client instance with API key from settings
 */
export async function getSMSHubClient(): Promise<SMSHubClient> {
  const db = await getDb();
  if (!db) {
    throw new Error('Database not available');
  }

  const settingsResult = await db
    .select()
    .from(settings)
    .where(eq(settings.key, 'smshub_api_key'))
    .limit(1);

  if (settingsResult.length === 0 || !settingsResult[0].value) {
    throw new Error('SMSHub API key not configured');
  }

  return new SMSHubClient(settingsResult[0].value);
}

/**
 * Get all current active activations
 * Returns list of all active numbers with their status and SMS codes
 */
export async function getCurrentActivations(
  apiKey: string,
  baseUrl: string = SMSHUB_BASE_URL
): Promise<Array<{ activationId: string; phoneNumber: string; smsCode?: string; status: string }>> {
  try {
    const params = new URLSearchParams({
      api_key: apiKey,
      action: 'getCurrentActivations',
    });

    const response = await axios.get(`${baseUrl}?${params.toString()}`);
    const data = response.data;

    // Response format varies by API:
    // SMSHub: { activeActivations: [ { activationId, phoneNumber, service, activationStatus, sms: [{ code, text }] } ] }
    // SMS24h: Similar structure
    
    if (typeof data === 'string' && data.startsWith('NO_ACTIVATION')) {
      return [];
    }

    if (data.activeActivations && Array.isArray(data.activeActivations)) {
      return data.activeActivations.map((item: any) => ({
        activationId: String(item.activationId || item.id || ''),
        phoneNumber: String(item.phoneNumber || item.phone || ''),
        smsCode: item.sms && item.sms.length > 0 ? item.sms[0].code : undefined,
        status: item.activationStatus || item.status || 'unknown',
      }));
    }

    return [];
  } catch (error: any) {
    console.error('[getCurrentActivations] Error:', error.message);
    return [];
  }
}
