import { router, publicProcedure } from "../_core/trpc";
import { efiPayClient } from "../efipay-client";
import { getDb } from "../db";
import { pixTransactions, balanceTransactions, customers } from "../../drizzle/schema";
import { eq, and, desc } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

/**
 * PIX Payment Router
 * Handles PIX recharge transactions
 */

export const pixRouter = router({
  /**
   * Create a PIX charge for recharge
   */
  createCharge: publicProcedure
    .input(
      z.object({
        customerId: z.number(),
        amount: z.number().min(100), // Minimum R$ 1.00 (100 cents)
      })
    )
    .mutation(async ({ input }) => {
      try {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

        // Validate customer exists
        const customerResult = await db
          .select()
          .from(customers)
          .where(eq(customers.id, input.customerId))
          .limit(1);

        const customer = customerResult[0];

        if (!customer) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Cliente não encontrado",
          });
        }

        if (!customer.active) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Cliente inativo",
          });
        }

        // Create PIX charge via EfiPay
        if (!efiPayClient) {
          throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'EfiPay client not initialized' });
        }
        const charge = await efiPayClient.createCharge({
          amount: input.amount,
          description: `Recarga - Número virtual - ${customer.pin}`,
          expirationSeconds: 3600, // 1 hour
        });

        // Generate QR Code image URL
        if (!efiPayClient) {
          throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'EfiPay client not initialized' });
        }
        const qrCodeUrl = efiPayClient.generateQRCodeImageUrl(charge.pixCopyPaste);

        // Save transaction to database
        await db.insert(pixTransactions).values({
          customerId: input.customerId,
          txid: charge.txid,
          amount: input.amount,
          status: "pending",
          pixCopyPaste: charge.pixCopyPaste,
          qrCodeUrl,
          expiresAt: charge.expiresAt,
        });

        console.log("[PIX] Charge created:", {
          txid: charge.txid,
          customerId: input.customerId,
          amount: input.amount,
        });

        return {
          txid: charge.txid,
          pixCopyPaste: charge.pixCopyPaste,
          qrCodeUrl,
          amount: input.amount,
          expiresAt: charge.expiresAt,
        };
      } catch (error: any) {
        console.error("[PIX] Error creating charge:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error.message || "Erro ao criar cobrança PIX",
        });
      }
    }),

  /**
   * Get PIX transaction status
   */
  getTransaction: publicProcedure
    .input(
      z.object({
        txid: z.string(),
        customerId: z.number(),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const result = await db
        .select()
        .from(pixTransactions)
        .where(
          and(
            eq(pixTransactions.txid, input.txid),
            eq(pixTransactions.customerId, input.customerId)
          )
        )
        .limit(1);

      const transaction = result[0];

      if (!transaction) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Transação não encontrada",
        });
      }

      return transaction;
    }),

  /**
   * List customer's PIX transactions
   */
  listTransactions: publicProcedure
    .input(
      z.object({
        customerId: z.number(),
        limit: z.number().optional().default(10),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const transactions = await db
        .select()
        .from(pixTransactions)
        .where(eq(pixTransactions.customerId, input.customerId))
        .orderBy(desc(pixTransactions.createdAt))
        .limit(input.limit);

      return transactions;
    }),

  /**
   * Setup webhook URL in EfiPay
   * This configures the webhook URL to receive payment notifications
   */
  setupWebhook: publicProcedure
    .input(
      z.object({
        webhookUrl: z.string().url(),
      })
    )
    .mutation(async ({ input }) => {
      try {
        if (!efiPayClient) {
          throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'EfiPay client not initialized' });
        }
        const response = await efiPayClient.configureWebhook(input.webhookUrl);
        
        console.log("[PIX] Webhook configured successfully:", {
          webhookUrl: input.webhookUrl,
          response,
        });

        return {
          success: true,
          webhookUrl: input.webhookUrl,
          message: "Webhook configurado com sucesso",
        };
      } catch (error: any) {
        console.error("[PIX] Error configuring webhook:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error.message || "Erro ao configurar webhook",
        });
      }
    }),

  /**
   * Webhook endpoint to receive payment confirmation from EfiPay
   * This will be called by EfiPay when payment is confirmed
   */
  webhook: publicProcedure
    .input(
      z.object({
        pix: z.array(
          z.object({
            endToEndId: z.string(),
            txid: z.string(),
            valor: z.string(),
            horario: z.string(),
            infoPagador: z.string().optional(),
          })
        ),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

        // Parse webhook payload
        if (!efiPayClient) {
          throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'EfiPay client not initialized' });
        }
        const pixData = efiPayClient.parseWebhookPayload(input);

        console.log("[PIX Webhook] Payment received:", {
          txid: pixData.txid,
          amount: pixData.amount,
          paidAt: pixData.paidAt,
        });

        // Find transaction
        const transactionResult = await db
          .select()
          .from(pixTransactions)
          .where(eq(pixTransactions.txid, pixData.txid))
          .limit(1);

        const transaction = transactionResult[0];

        if (!transaction) {
          console.error("[PIX Webhook] Transaction not found:", pixData.txid);
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Transação não encontrada",
          });
        }

        // Check if already processed
        if (transaction.status === "paid") {
          console.log("[PIX Webhook] Transaction already processed:", pixData.txid);
          return { success: true, message: "Already processed" };
        }

        // Update transaction status
        await db
          .update(pixTransactions)
          .set({
            status: "paid",
            paidAt: pixData.paidAt,
            updatedAt: new Date(),
          })
          .where(eq(pixTransactions.id, transaction.id));

        // Get customer current balance
        const customerResult = await db
          .select()
          .from(customers)
          .where(eq(customers.id, transaction.customerId))
          .limit(1);

        const customer = customerResult[0];

        if (!customer) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Cliente não encontrado",
          });
        }

        const balanceBefore = customer.balance;
        const balanceAfter = balanceBefore + transaction.amount;

        // Add balance to customer
        await db
          .update(customers)
          .set({
            balance: balanceAfter,
            updatedAt: new Date(),
          })
          .where(eq(customers.id, transaction.customerId));

        // Create balance transaction record
        await db.insert(balanceTransactions).values({
          customerId: transaction.customerId,
          amount: transaction.amount,
          type: "credit",
          description: `Recarga via PIX - ${pixData.txid}`,
          balanceBefore,
          balanceAfter,
          createdAt: new Date(),
        });

        console.log("[PIX Webhook] Balance updated:", {
          customerId: transaction.customerId,
          balanceBefore,
          balanceAfter,
          amount: transaction.amount,
        });

        return {
          success: true,
          message: "Payment processed successfully",
        };
      } catch (error: any) {
        console.error("[PIX Webhook] Error processing payment:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error.message || "Erro ao processar pagamento",
        });
      }
    }),
});
