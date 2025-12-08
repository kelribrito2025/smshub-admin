import { Router } from "express";
import { getDb } from "./db";
import { pixTransactions, balanceTransactions, customers, recharges } from "../drizzle/schema";
import { eq } from "drizzle-orm";
import { efiPayClient } from "./efipay-client";
import { notificationsManager } from "./notifications-manager";
import { processFirstRechargeBonus } from "./db-helpers/affiliate-helpers";

const router = Router();

// Middleware to log ALL requests to webhook (even if they fail)
router.use("/webhook/pix", (req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log("\n" + "=".repeat(80));
  console.log(`[${timestamp}] 🔔 WEBHOOK REQUEST RECEIVED`);
  console.log("=".repeat(80));
  console.log("Method:", req.method);
  console.log("URL:", req.url);
  console.log("Headers:", JSON.stringify(req.headers, null, 2));
  console.log("Body:", JSON.stringify(req.body, null, 2));
  console.log("IP:", req.ip || req.connection.remoteAddress);
  console.log("User-Agent:", req.get("user-agent"));
  console.log("=".repeat(80) + "\n");
  next();
});

/**
 * EfiPay PIX Webhook Endpoint
 * Receives payment confirmation from EfiPay
 */
router.post("/webhook/pix", async (req, res) => {
  try {
    console.log("\n\n========== PIX WEBHOOK CALLED - VERSION 2.0 ==========\n");
    console.log("[PIX Webhook] Received webhook:", JSON.stringify(req.body, null, 2));

    const db = await getDb();
    if (!db) {
      console.error("[PIX Webhook] Database not available");
      return res.status(500).json({ error: "Database not available" });
    }

    // Handle test webhook from EfiPay (empty or test payload)
    if (!req.body.pix || !Array.isArray(req.body.pix) || req.body.pix.length === 0) {
      console.log("[PIX Webhook] Test webhook received (no pix data)");
      return res.status(200).json({ success: true, message: "Webhook configured successfully" });
    }

    // Parse webhook data
    if (!efiPayClient) {
      console.error('[PIX Webhook] Payment system not configured');
      return res.status(503).json({ error: 'Payment system not configured' });
    }
    const pixData = efiPayClient.parseWebhookPayload(req.body);

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
      return res.status(404).json({ error: "Transaction not found" });
    }

    // Check if already processed
    if (transaction.status === "paid") {
      console.log("[PIX Webhook] Transaction already processed:", pixData.txid);
      return res.status(200).json({ success: true, message: "Already processed" });
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
      console.error("[PIX Webhook] Customer not found:", transaction.customerId);
      return res.status(404).json({ error: "Customer not found" });
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
    console.log("[PIX Webhook] CHECKPOINT 1: About to create balance transaction");
    await db.insert(balanceTransactions).values({
      customerId: transaction.customerId,
      amount: transaction.amount,
      type: "credit",
      origin: "system",
      description: `Recarga via PIX - ${pixData.txid}`,
      balanceBefore,
      balanceAfter,
      createdAt: new Date(),
    });

    // Create recharge record for history (CRITICAL - must succeed)
    try {
      const now = new Date(); // Create single timestamp for consistency
      console.log("[PIX Webhook] Creating recharge record:", {
        customerId: transaction.customerId,
        amount: transaction.amount,
        paymentMethod: "pix",
        status: "completed",
        transactionId: pixData.txid,
        timestamp: now,
      });
      
      const rechargeResult = await db.insert(recharges).values({
        customerId: transaction.customerId,
        amount: transaction.amount,
        paymentMethod: "pix",
        status: "completed",
        transactionId: pixData.txid,
        completedAt: pixData.paidAt,
        createdAt: now,
        // updatedAt is auto-managed by .onUpdateNow() in schema - do NOT pass manually
      });
      
      console.log("[PIX Webhook] ✅ Recharge record created successfully:", rechargeResult);
    } catch (rechargeError: any) {
      console.error("[PIX Webhook] ❌ CRITICAL ERROR creating recharge record:", rechargeError);
      console.error("[PIX Webhook] Error message:", rechargeError?.message);
      console.error("[PIX Webhook] Error stack:", rechargeError?.stack);
      console.error("[PIX Webhook] Error code:", rechargeError?.code);
      console.error("[PIX Webhook] Full error object:", JSON.stringify(rechargeError, Object.getOwnPropertyNames(rechargeError), 2));
      
      // This is critical - if recharge record fails, we should know about it
      // The balance was already credited, but history won't show it
      console.error("[PIX Webhook] ⚠️ WARNING: Balance was credited but recharge history record failed!");
      console.error("[PIX Webhook] Transaction details:", {
        pixTransactionId: transaction.id,
        customerId: transaction.customerId,
        amount: transaction.amount,
        txid: pixData.txid,
      });
    }

    console.log("[PIX Webhook] Balance updated:", {
      customerId: transaction.customerId,
      balanceBefore,
      balanceAfter,
      amount: transaction.amount,
    });

    // Send real-time notification to customer
    notificationsManager.sendToCustomer(transaction.customerId, {
      type: "pix_payment_confirmed",
      title: "Recarga Aprovada! 💰",
      message: `Sua recarga de R$ ${(transaction.amount / 100).toFixed(2)} foi confirmada!`,
      data: {
        amount: transaction.amount,
        balanceBefore,
        balanceAfter,
        txid: pixData.txid,
      },
    });

    // Send cache invalidation event to update recharges list
    notificationsManager.sendToCustomer(transaction.customerId, {
      type: "recharge_completed",
      title: "Cache Invalidation",
      message: "Recharge list needs refresh",
      data: {
        action: "invalidate_recharges",
      },
    });

    // Check if this is the first recharge and process referral bonus
    try {
      const bonusResult = await processFirstRechargeBonus(
        transaction.customerId,
        transaction.amount
      );

      if (bonusResult) {
        console.log("[PIX Webhook] First recharge bonus granted:", {
          customerId: transaction.customerId,
          bonusAmount: bonusResult.bonusAmount,
          affiliateId: bonusResult.affiliateId,
        });
      }
    } catch (bonusError) {
      console.error("[PIX Webhook] Error processing first recharge bonus:", bonusError);
      // Don't fail the webhook if bonus processing fails
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error("[PIX Webhook] Error processing webhook:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
