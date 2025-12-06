import { z } from "zod";
import { publicProcedure, router } from "./_core/trpc";
import Stripe from "stripe";
import { getDb } from "./db";
import { stripeTransactions, customers } from "../drizzle/schema";
import { eq, and } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

let stripe: Stripe | null = null;

try {
  if (process.env.STRIPE_SECRET_KEY) {
    stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2025-11-17.clover",
    });
  } else {
    console.warn('[Stripe] STRIPE_SECRET_KEY not configured - Stripe payments will be disabled');
  }
} catch (error) {
  console.warn('[Stripe] Failed to initialize:', (error as Error).message);
}

export const stripeRouter = router({
  /**
   * Create Stripe Checkout Session for customer recharge
   */
  createCheckoutSession: publicProcedure
    .input(
      z.object({
        customerId: z.number(),
        amount: z.number().min(50), // Minimum $0.50 USD (50 cents)
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { customerId, amount } = input;

      // Get customer details
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const customerResult = await db
        .select()
        .from(customers)
        .where(eq(customers.id, customerId))
        .limit(1);

      const customer = customerResult[0];

      if (!customer) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Cliente não encontrado",
        });
      }

      // Create Stripe Checkout Session
      if (!stripe) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Stripe payment system not configured',
        });
      }
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        line_items: [
          {
            price_data: {
              currency: "brl",
              product_data: {
                name: "Recarga de Saldo",
                description: `Recarga de R$ ${(amount / 100).toFixed(2)}`,
              },
              unit_amount: amount, // Amount in cents
            },
            quantity: 1,
          },
        ],
        mode: "payment",
        success_url: `${ctx.req.headers.origin}/store?payment=success`,
        cancel_url: `${ctx.req.headers.origin}/store?payment=cancelled`,
        customer_email: customer.email,
        client_reference_id: customerId.toString(),
        metadata: {
          customer_id: customerId.toString(),
          customer_email: customer.email,
          customer_name: customer.name,
          amount: amount.toString(),
        },
        allow_promotion_codes: true,
      });

      // Save transaction in database
      await db.insert(stripeTransactions).values({
        customerId,
        sessionId: session.id,
        amount,
        status: "pending",
      });

      return {
        sessionId: session.id,
        checkoutUrl: session.url!,
      };
    }),

  /**
   * Get transaction status
   */
  getTransaction: publicProcedure
    .input(
      z.object({
        sessionId: z.string(),
        customerId: z.number(),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const result = await db
        .select()
        .from(stripeTransactions)
        .where(
          and(
            eq(stripeTransactions.sessionId, input.sessionId),
            eq(stripeTransactions.customerId, input.customerId)
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

      return {
        id: transaction.id,
        sessionId: transaction.sessionId,
        amount: transaction.amount,
        status: transaction.status,
        createdAt: transaction.createdAt,
      };
    }),
});
