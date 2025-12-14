import { router, protectedProcedure } from "../_core/trpc";
import { z } from "zod";
import { getDb } from "../db";
import { recharges, refunds, customers, pixTransactions, stripeTransactions } from "../../drizzle/schema";
import { eq, and, gte, lte, desc, or, like, sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

/**
 * Admin-only procedure that checks if user is admin
 */
const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
  }
  return next({ ctx });
});

export const paymentsRouter = router({
  /**
   * Get payment statistics (cards de resumo)
   */
  getStats: adminProcedure
    .input(z.object({
      startDate: z.string().optional(),
      endDate: z.string().optional(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const { startDate, endDate } = input;

      // Build date filter
      const dateFilter = [];
      if (startDate) {
        dateFilter.push(gte(recharges.createdAt, new Date(startDate)));
      }
      if (endDate) {
        const endDateTime = new Date(endDate);
        endDateTime.setHours(23, 59, 59, 999);
        dateFilter.push(lte(recharges.createdAt, endDateTime));
      }

      // Total de pagamentos recebidos (completed recharges)
      const [totalPaymentsResult] = await db
        .select({
          total: sql<number>`COALESCE(SUM(${recharges.amount}), 0)`,
        })
        .from(recharges)
        .where(
          and(
            eq(recharges.status, "completed"),
            ...(dateFilter.length > 0 ? dateFilter : [])
          )
        );

      // Total de devoluções via Pix (completed refunds)
      const [totalRefundsResult] = await db
        .select({
          total: sql<number>`COALESCE(SUM(${refunds.amount}), 0)`,
        })
        .from(refunds)
        .where(
          and(
            eq(refunds.status, "completed"),
            ...(dateFilter.length > 0 ? [
              ...(startDate ? [gte(refunds.createdAt, new Date(startDate))] : []),
              ...(endDate ? [lte(refunds.createdAt, new Date(endDate))] : []),
            ] : [])
          )
        );

      return {
        totalPayments: Number(totalPaymentsResult?.total || 0),
        totalRefunds: Number(totalRefundsResult?.total || 0),
      };
    }),

  /**
   * Get paginated list of payments with filters
   */
  getPayments: adminProcedure
    .input(z.object({
      searchTerm: z.string().optional(),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
      page: z.number().default(1),
      limit: z.number().default(30),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const { searchTerm, startDate, endDate, page, limit } = input;
      const offset = (page - 1) * limit;

      // Build filters
      const filters = [eq(recharges.status, "completed")];

      // Date filters
      if (startDate) {
        filters.push(gte(recharges.createdAt, new Date(startDate)));
      }
      if (endDate) {
        const endDateTime = new Date(endDate);
        endDateTime.setHours(23, 59, 59, 999);
        filters.push(lte(recharges.createdAt, endDateTime));
      }

      // Get payments with customer info
      let query = db
        .select({
          id: recharges.id,
          customerId: recharges.customerId,
          amount: recharges.amount,
          paymentMethod: recharges.paymentMethod,
          transactionId: recharges.transactionId,
          stripePaymentIntentId: recharges.stripePaymentIntentId,
          metadata: recharges.metadata,
          createdAt: recharges.createdAt,
          completedAt: recharges.completedAt,
          customerName: customers.name,
          customerPin: customers.pin,
          customerEmail: customers.email,
        })
        .from(recharges)
        .leftJoin(customers, eq(recharges.customerId, customers.id))
        .where(and(...filters))
        .orderBy(desc(recharges.createdAt))
        .limit(limit)
        .offset(offset);

      let payments = await query;

      // Apply search filter in memory (search by PIN, name, email)
      if (searchTerm && searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        payments = payments.filter(p => 
          p.customerPin?.toString().includes(term) ||
          p.customerName?.toLowerCase().includes(term) ||
          p.customerEmail?.toLowerCase().includes(term)
        );
      }

      // Get PIX details for PIX payments
      const pixPayments = payments.filter(p => p.paymentMethod === 'pix');
      const pixDetails = pixPayments.length > 0 ? await db
        .select({
          txid: pixTransactions.txid,
          customerId: pixTransactions.customerId,
        })
        .from(pixTransactions)
        .where(
          and(
            eq(pixTransactions.status, 'paid'),
            sql`${pixTransactions.customerId} IN (${sql.join(pixPayments.map(p => sql`${p.customerId}`), sql`, `)})`
          )
        ) : [];

      // Enrich payments with additional details
      const enrichedPayments = payments.map(payment => {
        let endToEndId = null;
        let paymentHash = null;

        if (payment.paymentMethod === 'pix') {
          // Get PIX end-to-end from metadata or PIX transaction
          const pixDetail = pixDetails.find(p => p.customerId === payment.customerId);
          if (pixDetail) {
            endToEndId = pixDetail.txid;
          }
          
          // Parse metadata for additional info
          if (payment.metadata) {
            try {
              const meta = JSON.parse(payment.metadata);
              paymentHash = meta.hash || meta.txid || null;
            } catch (e) {
              // Ignore parse errors
            }
          }
        } else if (payment.paymentMethod === 'card') {
          paymentHash = payment.stripePaymentIntentId || payment.transactionId;
        }

        return {
          ...payment,
          endToEndId,
          paymentHash,
        };
      });

      // Get total count for pagination
      const [countResult] = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(recharges)
        .where(and(...filters));

      return {
        payments: enrichedPayments,
        total: Number(countResult?.count || 0),
        page,
        limit,
      };
    }),

  /**
   * Process refund (integral ou parcial)
   */
  processRefund: adminProcedure
    .input(z.object({
      rechargeId: z.number(),
      amount: z.number().optional(), // If not provided, full refund
      reason: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const { rechargeId, amount, reason } = input;

      // Get recharge details
      const [recharge] = await db
        .select()
        .from(recharges)
        .where(eq(recharges.id, rechargeId));

      if (!recharge) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Recarga não encontrada" });
      }

      if (recharge.status !== "completed") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Apenas recargas concluídas podem ser devolvidas" });
      }

      // Determine refund amount
      const refundAmount = amount || recharge.amount;

      if (refundAmount > recharge.amount) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Valor de devolução não pode ser maior que o valor original" });
      }

      // Create refund record
      const paymentMethodMap: Record<string, 'pix' | 'card'> = {
        'pix': 'pix',
        'card': 'card',
        'crypto': 'card', // Map crypto to card for refunds table
        'picpay': 'pix', // Map picpay to pix for refunds table
      };

      const mappedPaymentMethod = paymentMethodMap[recharge.paymentMethod] || 'pix';

      // Get end-to-end ID for PIX refunds
      let endToEndId = null;
      if (mappedPaymentMethod === 'pix' && recharge.transactionId) {
        const [pixTx] = await db
          .select({ txid: pixTransactions.txid })
          .from(pixTransactions)
          .where(eq(pixTransactions.txid, recharge.transactionId));
        endToEndId = pixTx?.txid || null;
      }

      const [refundRecord] = await db.insert(refunds).values({
        customerId: recharge.customerId,
        rechargeId: recharge.id,
        paymentMethod: mappedPaymentMethod,
        amount: refundAmount,
        originalAmount: recharge.amount,
        status: "pending",
        paymentId: recharge.transactionId || recharge.stripePaymentIntentId || null,
        endToEndId,
        reason: reason || "Devolução solicitada pelo admin",
        processedBy: ctx.user.id,
      });

      const refundId = refundRecord.insertId;

      // Process refund via payment provider
      try {
        if (mappedPaymentMethod === 'pix' && endToEndId) {
          // Process PIX refund via EfiPay
          const { efiPayClient } = await import('../efipay-client');
          if (!efiPayClient) {
            throw new Error('EfiPay client not available');
          }

          const refundResult = await efiPayClient.processRefund({
            endToEndId,
            amount: refundAmount,
            reason: reason || "Devolução solicitada pelo admin",
          });

          // Update refund status
          await db.update(refunds)
            .set({ 
              status: "completed", 
              completedAt: new Date(),
              refundId: refundResult.refundId,
            })
            .where(eq(refunds.id, refundId));

          return {
            success: true,
            refundId,
            message: "Devolução PIX processada com sucesso!",
          };
        } else if (mappedPaymentMethod === 'card' && recharge.stripePaymentIntentId) {
          // TODO: Process Stripe refund
          // For now, mark as pending and notify admin
          return {
            success: true,
            refundId,
            message: "Devolução de cartão criada. Processamento manual necessário via Stripe Dashboard.",
          };
        } else {
          throw new Error('Método de pagamento não suportado para devolução automática');
        }
      } catch (error: any) {
        // Mark refund as failed
        await db.update(refunds)
          .set({ status: "failed" })
          .where(eq(refunds.id, refundId));

        throw new TRPCError({ 
          code: "INTERNAL_SERVER_ERROR", 
          message: `Erro ao processar devolução: ${error.message}` 
        });
      }
    }),
});
