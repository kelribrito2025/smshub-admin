import { z } from "zod";
import { publicProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { stripeTransactions } from "../../drizzle/schema";
import { eq } from "drizzle-orm";
import Stripe from "stripe";

let stripe: Stripe | null = null;

try {
  if (process.env.STRIPE_SECRET_KEY) {
    stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2025-11-17.clover",
    });
  } else {
    console.warn('[Stripe Router] STRIPE_SECRET_KEY not configured');
  }
} catch (error) {
  console.warn('[Stripe Router] Failed to initialize:', (error as Error).message);
}

/**
 * Router para pagamentos via Stripe (Checkout Session)
 * Segue a arquitetura existente do projeto
 */
export const stripeRouter = router({
  /**
   * Criar Checkout Session para recarga de saldo
   */
  createCheckoutSession: publicProcedure
    .input(
      z.object({
        customerId: z.number(),
        amount: z.number().min(100), // Mínimo R$ 1,00 (100 centavos)
      })
    )
    .mutation(async ({ input, ctx }) => {
      if (!stripe) {
        throw new Error("Stripe not configured");
      }

      const db = await getDb();
      if (!db) {
        throw new Error("Database connection failed");
      }

      // Get origin from request headers
      const origin = ctx.req.headers.origin || "http://localhost:3000";

      // Create Stripe Checkout Session
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        mode: "payment",
        line_items: [
          {
            price_data: {
              currency: "brl",
              product_data: {
                name: "Recarga de Saldo",
                description: `Recarga de R$ ${(input.amount / 100).toFixed(2)}`,
              },
              unit_amount: input.amount,
            },
            quantity: 1,
          },
        ],
        success_url: `${origin}/store/recharges?success=true`,
        cancel_url: `${origin}/store/recharges?canceled=true`,
        metadata: {
          customerId: input.customerId.toString(),
        },
      });

      // Create transaction record
      await db.insert(stripeTransactions).values({
        customerId: input.customerId,
        sessionId: session.id,
        amount: input.amount,
        status: "pending",
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      return {
        checkoutUrl: session.url!,
        sessionId: session.id,
      };
    }),

  /**
   * Verificar status de uma sessão de checkout
   */
  checkSessionStatus: publicProcedure
    .input(
      z.object({
        sessionId: z.string(),
      })
    )
    .query(async ({ input }) => {
      if (!stripe) {
        throw new Error("Stripe not configured");
      }

      const session = await stripe.checkout.sessions.retrieve(input.sessionId);

      return {
        status: session.payment_status,
        amount: session.amount_total,
        currency: session.currency,
      };
    }),
});
