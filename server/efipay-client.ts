import EfiPay from "sdk-node-apis-efi";
import fs from "fs";
import path from "path";
import { randomUUID } from "crypto";

/**
 * EfiPay PIX Client
 * Handles PIX payment integration with EfiPay API
 */

interface EfiPayConfig {
  clientId: string;
  clientSecret: string;
  certificatePath: string;
  sandbox: boolean;
  pixKey: string;
}

interface CreateChargeParams {
  amount: number; // Amount in cents
  description: string;
  expirationSeconds?: number; // Default: 3600 (1 hour)
}

interface CreateChargeResponse {
  txid: string;
  pixCopyPaste: string;
  qrCodeUrl: string;
  expiresAt: Date;
}

interface WebhookPayload {
  pix: Array<{
    endToEndId: string;
    txid: string;
    valor: string;
    horario: string;
    infoPagador?: string;
  }>;
}

export class EfiPayClient {
  private client: any;
  private config: EfiPayConfig;

  constructor() {
    const environment = process.env.EFIPAY_ENVIRONMENT || "production";
    const isSandbox = environment === "sandbox";

    this.config = {
      clientId: isSandbox
        ? process.env.EFIPAY_CLIENT_ID_SANDBOX!
        : process.env.EFIPAY_CLIENT_ID_PROD!,
      clientSecret: isSandbox
        ? process.env.EFIPAY_CLIENT_SECRET_SANDBOX!
        : process.env.EFIPAY_CLIENT_SECRET_PROD!,
      certificatePath: path.join(process.cwd(), "certs", "efipay-prod.p12"),
      sandbox: isSandbox,
      pixKey: process.env.EFIPAY_PIX_KEY!,
    };

    // Validate required credentials
    if (!this.config.clientId || !this.config.clientSecret) {
      throw new Error("EfiPay credentials not configured");
    }

    if (!this.config.pixKey) {
      throw new Error("EfiPay PIX key not configured");
    }

    if (!fs.existsSync(this.config.certificatePath)) {
      throw new Error(
        `EfiPay certificate not found at ${this.config.certificatePath}`
      );
    }

    // Initialize EfiPay SDK
    this.client = new EfiPay({
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret,
      certificate: this.config.certificatePath,
      sandbox: this.config.sandbox,
    });
  }

  /**
   * Create a PIX charge
   */
  async createCharge(
    params: CreateChargeParams
  ): Promise<CreateChargeResponse> {
    try {
      const txid = randomUUID().replace(/-/g, ""); // Generate unique transaction ID
      const amountInReais = (params.amount / 100).toFixed(2);

      const body = {
        calendario: {
          expiracao: params.expirationSeconds || 3600, // Default: 1 hour
        },
        valor: {
          original: amountInReais,
        },
        chave: this.config.pixKey,
        solicitacaoPagador: params.description,
      };

      console.log("[EfiPay] Creating PIX charge:", {
        txid,
        amount: amountInReais,
        description: params.description,
      });

      const response = await this.client.pixCreateImmediateCharge(
        { txid },
        body
      );

      if (!response || !response.pixCopiaECola) {
        throw new Error("Invalid response from EfiPay API");
      }

      // Calculate expiration date
      const expiresAt = new Date();
      expiresAt.setSeconds(
        expiresAt.getSeconds() + (params.expirationSeconds || 3600)
      );

      console.log("[EfiPay] Charge created successfully:", {
        txid: response.txid,
        status: response.status,
      });

      return {
        txid: response.txid,
        pixCopyPaste: response.pixCopiaECola,
        qrCodeUrl: response.loc?.location || "",
        expiresAt,
      };
    } catch (error: any) {
      console.error("[EfiPay] Error creating charge:", error);
      
      // Extract error message from different formats
      let errorMessage = "Unknown error";
      
      if (error.message) {
        errorMessage = error.message;
      } else if (error.response?.data) {
        // Try to parse JSON response
        try {
          const data = typeof error.response.data === 'string' 
            ? JSON.parse(error.response.data) 
            : error.response.data;
          errorMessage = data.mensagem || data.message || JSON.stringify(data);
        } catch {
          // If not JSON, use as string
          errorMessage = String(error.response.data);
        }
      } else if (error.response?.statusText) {
        errorMessage = error.response.statusText;
      }
      
      // Check for rate limit error
      if (errorMessage.includes('Rate exceeded') || errorMessage.includes('rate limit')) {
        throw new Error('Limite de requisições excedido. Aguarde alguns segundos e tente novamente.');
      }
      
      throw new Error(`Erro ao gerar PIX: ${errorMessage}`);
    }
  }

  /**
   * Get charge details
   */
  async getCharge(txid: string) {
    try {
      const response = await this.client.pixDetailCharge({ txid });
      return response;
    } catch (error: any) {
      console.error("[EfiPay] Error getting charge:", error);
      throw new Error(
        `Failed to get charge details: ${error.message || "Unknown error"}`
      );
    }
  }

  /**
   * Configure webhook URL
   */
  async configureWebhook(webhookUrl: string) {
    try {
      const params = {
        chave: this.config.pixKey,
      };

      const body = {
        webhookUrl,
      };

      const response = await this.client.pixConfigWebhook(params, body);
      console.log("[EfiPay] Webhook configured:", response);
      return response;
    } catch (error: any) {
      console.error("[EfiPay] Error configuring webhook:", error);
      throw new Error(
        `Failed to configure webhook: ${error.message || "Unknown error"}`
      );
    }
  }

  /**
   * Parse webhook payload
   */
  parseWebhookPayload(payload: WebhookPayload) {
    if (!payload.pix || payload.pix.length === 0) {
      throw new Error("Invalid webhook payload: no PIX data");
    }

    const pixData = payload.pix[0];

    return {
      txid: pixData.txid,
      endToEndId: pixData.endToEndId,
      amount: parseFloat(pixData.valor) * 100, // Convert to cents
      paidAt: new Date(pixData.horario),
      payerInfo: pixData.infoPagador,
    };
  }

  /**
   * Generate QR Code image URL from pixCopyPaste
   */
  generateQRCodeImageUrl(pixCopyPaste: string): string {
    // Use a QR Code generation service
    // Example: https://api.qrserver.com/v1/create-qr-code/
    const encodedPix = encodeURIComponent(pixCopyPaste);
    return `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodedPix}`;
  }
}

// Export singleton instance (only if credentials are configured)
let _efiPayClient: EfiPayClient | null = null;

try {
  _efiPayClient = new EfiPayClient();
} catch (error) {
  console.warn('[EfiPay] Client not initialized:', (error as Error).message);
  console.warn('[EfiPay] Payment features will be disabled');
}

export const efiPayClient = _efiPayClient;
