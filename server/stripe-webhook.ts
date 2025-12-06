import express from "express";
import Stripe from "stripe";
import { getDb } from "./db";
import { stripeTransactions, balanceTransactions, customers, recharges } from "../drizzle/schema";
import { eq } from "drizzle-orm";
import { notificationsManager } from "./notifications-manager";
import { processFirstRechargeBonus } from "./db-helpers/affiliate-helpers";

let stripe: Stripe | null = null;

try {
  if (process.env.STRIPE_SECRET_KEY) {
    stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2025-11-17.clover",
    });
  } else {
    console.warn('[Stripe Webhook] STRIPE_SECRET_KEY not configured');
  }
} catch (error) {
  console.warn('[Stripe Webhook] Failed to initialize:', (error as Error).message);
}

const router = express.Router();

/**
 * Stripe Webhook Endpoint
 * Receives payment confirmations from Stripe
 */
router.post("/webhook", async (req, res) => {
  const sig = req.headers["stripe-signature"];

  if (!sig) {
    console.error("[Stripe Webhook] Missing stripe-signature header");
    return res.status(400).send("Missing signature");
  }

  let event: Stripe.Event;

  if (!stripe) {
    console.error('[Stripe Webhook] Stripe not configured');
    return res.status(503).send('Stripe not configured');
  }

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err: any) {
    console.error(`[Stripe Webhook] Signature verification failed:`, err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  console.log(`[Stripe Webhook] Received event: ${event.type} (${event.id})`);

  // Handle test events
  if (event.id.startsWith("evt_test_")) {
    console.log("[Stripe Webhook] Test event detected, returning verification response");
    return res.json({ verified: true });
  }

  // Handle checkout.session.completed event
  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;

    console.log(`[Stripe Webhook] Processing checkout session: ${session.id}`);

    try {
      const db = await getDb();
      if (!db) {
        console.error("[Stripe Webhook] Database not available");
        return res.status(500).send("Database not available");
      }

      // Get transaction from database
      const result = await db
        .select()
        .from(stripeTransactions)
        .where(eq(stripeTransactions.sessionId, session.id))
        .limit(1);

      const transaction = result[0];

      if (!transaction) {
        console.error(`[Stripe Webhook] Transaction not found for session ${session.id}`);
        return res.status(404).send("Transaction not found");
      }

      // Check if already processed
      if (transaction.status === "completed") {
        console.log(`[Stripe Webhook] Transaction ${transaction.id} already processed`);
        return res.json({ received: true, already_processed: true });
      }

      // Get customer
      const customerResult = await db
        .select()
        .from(customers)
        .where(eq(customers.id, transaction.customerId))
        .limit(1);

      const customer = customerResult[0];

      if (!customer) {
        console.error(`[Stripe Webhook] Customer ${transaction.customerId} not found`);
        return res.status(404).send("Customer not found");
      }

      // Update transaction status
      await db
        .update(stripeTransactions)
        .set({
          status: "completed",
          paymentIntentId: session.payment_intent as string,
          updatedAt: new Date(),
        })
        .where(eq(stripeTransactions.id, transaction.id));

      // Credit customer balance
      const newBalance = customer.balance + transaction.amount;

      await db
        .update(customers)
        .set({
          balance: newBalance,
          updatedAt: new Date(),
        })
        .where(eq(customers.id, customer.id));

      // Create balance transaction record
      await db.insert(balanceTransactions).values({
        customerId: customer.id,
        amount: transaction.amount,
        type: "credit",
        description: `Recarga via Stripe - R$ ${(transaction.amount / 100).toFixed(2)}`,
        balanceBefore: customer.balance,
        balanceAfter: newBalance,
      });

      // Create recharge record for history
      try {
        console.log("[Stripe Webhook] Creating recharge record:", {
          customerId: customer.id,
          amount: transaction.amount,
          paymentMethod: "card",
          status: "completed",
          transactionId: session.id,
        });
        
        await db.insert(recharges).values({
          customerId: customer.id,
          amount: transaction.amount,
          paymentMethod: "card",
          status: "completed",
          transactionId: session.id,
          completedAt: new Date(),
          createdAt: new Date(),
        });
        
        console.log("[Stripe Webhook] Recharge record created successfully");
      } catch (rechargeError) {
        console.error("[Stripe Webhook] ERROR creating recharge record:", rechargeError);
        console.error("[Stripe Webhook] Error details:", JSON.stringify(rechargeError, null, 2));
      }

      console.log(
        `[Stripe Webhook] Payment processed successfully:`,
        `Customer ${customer.id} (${customer.email})`,
        `Amount: R$ ${(transaction.amount / 100).toFixed(2)}`,
        `New balance: R$ ${(newBalance / 100).toFixed(2)}`
      );

      // Send notification to customer
      notificationsManager.sendToCustomer(customer.id, {
        type: "balance_updated",
        title: "Pagamento Confirmado!",
        message: `Sua recarga de R$ ${(transaction.amount / 100).toFixed(2)} foi aprovada. Novo saldo: R$ ${(newBalance / 100).toFixed(2)}`,
      });

      // Check if this is the first recharge and process referral bonus
      try {
        const bonusResult = await processFirstRechargeBonus(
          customer.id,
          transaction.amount
        );

        if (bonusResult) {
          console.log("[Stripe Webhook] Referral bonus processed:", bonusResult);
          
          // Notify affiliate about the bonus
          notificationsManager.sendToCustomer(bonusResult.affiliateId, {
            type: "balance_updated",
            title: "Novo Bônus de Afiliado! 🎉",
            message: `Você ganhou R$ ${(bonusResult.bonusAmount / 100).toFixed(2)} de bônus pela primeira recarga de um indicado!`,
            data: {
              bonusAmount: bonusResult.bonusAmount,
              referralId: bonusResult.referralId,
            },
          });
        }
      } catch (error) {
        console.error("[Stripe Webhook] Error processing referral bonus:", error);
        // Don't fail the webhook if bonus processing fails
      }

      return res.json({ received: true, processed: true });
    } catch (error: any) {
      console.error("[Stripe Webhook] Error processing payment:", error);
      return res.status(500).send(`Processing error: ${error.message}`);
    }
  }

  // Return success for other event types
  res.json({ received: true });
});

export default router;
