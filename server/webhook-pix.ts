import { Router } from "express";
import { getDb } from "./db";
import { pixTransactions, balanceTransactions, customers, recharges } from "../drizzle/schema";
import { eq } from "drizzle-orm";
import { efiPayClient } from "./efipay-client";
import { notificationsManager } from "./notifications-manager";
import { processFirstRechargeBonus } from "./db-helpers/affiliate-helpers";

const router = Router();

// Simple test endpoint to verify routing
router.get("/webhook/pix/test", (req, res) => {
  console.log("[PIX Webhook] Test endpoint called");
  res.status(200).json({ status: "ok", message: "Webhook routing is working", timestamp: new Date().toISOString() });
});

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
  const startTime = Date.now();
  const timestamps: Record<string, number> = { start: startTime };
  
  try {
    console.log("\n\n========== PIX WEBHOOK CALLED - VERSION 4.0 (WITH TIMESTAMPS) ==========\n");
    console.log("[PIX Webhook] Step 1: Received webhook");
    console.log("[PIX Webhook] Body:", JSON.stringify(req.body, null, 2));
    timestamps.received = Date.now();

    console.log("[PIX Webhook] Step 2: Getting database connection...");
    timestamps.beforeDb = Date.now();
    const db = await getDb();
    timestamps.afterDb = Date.now();
    if (!db) {
      console.error("[PIX Webhook] ERROR: Database not available");
      return res.status(500).json({ error: "Database not available" });
    }
    console.log("[PIX Webhook] Step 2: Database OK");

    // Handle test webhook from EfiPay (empty or test payload)
    console.log("[PIX Webhook] Step 3: Checking payload...");
    if (!req.body.pix || !Array.isArray(req.body.pix) || req.body.pix.length === 0) {
      console.log("[PIX Webhook] Test webhook received (no pix data) - returning success");
      return res.status(200).json({ success: true, message: "Webhook configured successfully" });
    }
    console.log("[PIX Webhook] Step 3: Payload has pix data");

    // Parse webhook data
    console.log("[PIX Webhook] Step 4: Checking efiPayClient...");
    console.log("[PIX Webhook] efiPayClient is:", efiPayClient ? "initialized" : "NULL");
    if (!efiPayClient) {
      console.error('[PIX Webhook] ERROR: Payment system not configured');
      return res.status(503).json({ error: 'Payment system not configured' });
    }
    console.log("[PIX Webhook] Step 4: efiPayClient OK");
    
    console.log("[PIX Webhook] Step 5: Parsing webhook payload...");
    const pixData = efiPayClient.parseWebhookPayload(req.body);
    console.log("[PIX Webhook] Step 5: Payload parsed successfully");

    console.log("[PIX Webhook] Payment received:", {
      txid: pixData.txid,
      amount: pixData.amount,
      paidAt: pixData.paidAt,
    });

    // Find transaction
    timestamps.beforeFindTx = Date.now();
    const transactionResult = await db
      .select()
      .from(pixTransactions)
      .where(eq(pixTransactions.txid, pixData.txid))
      .limit(1);
    timestamps.afterFindTx = Date.now();

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

    // Update transaction status and store endToEndId
    timestamps.beforeUpdateTx = Date.now();
    await db
      .update(pixTransactions)
      .set({
        status: "paid",
        endToEndId: pixData.endToEndId, // Store E2EID for refunds
        paidAt: pixData.paidAt,
        updatedAt: new Date(),
      })
      .where(eq(pixTransactions.id, transaction.id));
    timestamps.afterUpdateTx = Date.now();

    // Get customer current balance
    timestamps.beforeGetCustomer = Date.now();
    const customerResult = await db
      .select()
      .from(customers)
      .where(eq(customers.id, transaction.customerId))
      .limit(1);
    timestamps.afterGetCustomer = Date.now();

    const customer = customerResult[0];

    if (!customer) {
      console.error("[PIX Webhook] Customer not found:", transaction.customerId);
      return res.status(404).json({ error: "Customer not found" });
    }

    const balanceBefore = customer.balance;
    const balanceAfter = balanceBefore + transaction.amount;

    // Add balance to customer
    timestamps.beforeUpdateBalance = Date.now();
    await db
      .update(customers)
      .set({
        balance: balanceAfter,
        updatedAt: new Date(),
      })
      .where(eq(customers.id, transaction.customerId));
    timestamps.afterUpdateBalance = Date.now();

    // Create balance transaction record
    console.log("[PIX Webhook] CHECKPOINT 1: About to create balance transaction");
    timestamps.beforeBalanceTx = Date.now();
    await db.insert(balanceTransactions).values({
      customerId: transaction.customerId,
      amount: transaction.amount,
      type: "credit",
      origin: "customer",
      description: `Recarga via PIX - ${pixData.txid}`,
      balanceBefore,
      balanceAfter,
      createdAt: new Date(),
    });
    timestamps.afterBalanceTx = Date.now();

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
      
      timestamps.beforeRecharge = Date.now();
      const rechargeResult = await db.insert(recharges).values({
        customerId: transaction.customerId,
        amount: transaction.amount,
        paymentMethod: "pix",
        status: "completed",
        transactionId: pixData.txid,
        endToEndId: pixData.endToEndId, // PIX E2EID - required for refunds
        completedAt: pixData.paidAt,
        createdAt: now,
        // updatedAt is auto-managed by .onUpdateNow() in schema - do NOT pass manually
      });
      timestamps.afterRecharge = Date.now();
      
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

    // Send real-time notification to customer via SSE (no database save - notification shown in modal)
    timestamps.beforeSSE = Date.now();
    console.log('[PIX Webhook] Sending pix_payment_confirmed notification to customer:', transaction.customerId);
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
    
    // Send balance_updated event to trigger UI refresh (separate from payment confirmation)
    console.log('[PIX Webhook] Sending balance_updated notification to customer:', transaction.customerId);
    console.log('[PIX Webhook] Balance change:', balanceBefore, '→', balanceAfter);
    notificationsManager.sendToCustomer(transaction.customerId, {
      type: "balance_updated",
      title: "Saldo Atualizado",
      message: `Novo saldo: R$ ${(balanceAfter / 100).toFixed(2)}`,
      data: {
        balanceBefore,
        balanceAfter,
        amountAdded: transaction.amount,
      },
    });
    timestamps.afterSSE = Date.now();

    // Cache invalidation is handled automatically by SSE and polling
    // No need to send a user-facing notification for this technical event

    // Check if this is the first recharge and process referral bonus
    timestamps.beforeBonus = Date.now();
    try {
      const bonusResult = await processFirstRechargeBonus(
        transaction.customerId,
        transaction.amount
      );
      timestamps.afterBonus = Date.now();

      if (bonusResult) {
        console.log("[PIX Webhook] First recharge bonus granted:", {
          customerId: transaction.customerId,
          bonusAmount: bonusResult.bonusAmount,
          affiliateId: bonusResult.affiliateId,
        });
      }
    } catch (bonusError) {
      timestamps.afterBonus = Date.now();
      console.error("[PIX Webhook] Error processing first recharge bonus:", bonusError);
      // Don't fail the webhook if bonus processing fails
    }

    timestamps.end = Date.now();
    
    // Calculate and log all timing metrics
    const metrics = {
      total: timestamps.end - timestamps.start,
      dbConnection: timestamps.afterDb - timestamps.beforeDb,
      findTransaction: timestamps.afterFindTx - timestamps.beforeFindTx,
      updateTransaction: timestamps.afterUpdateTx - timestamps.beforeUpdateTx,
      getCustomer: timestamps.afterGetCustomer - timestamps.beforeGetCustomer,
      updateBalance: timestamps.afterUpdateBalance - timestamps.beforeUpdateBalance,
      balanceTransaction: timestamps.afterBalanceTx - timestamps.beforeBalanceTx,
      rechargeRecord: timestamps.afterRecharge - timestamps.beforeRecharge,
      sseNotification: timestamps.afterSSE - timestamps.beforeSSE,
      bonusProcessing: timestamps.afterBonus - timestamps.beforeBonus,
    };
    
    console.log("\n========== WEBHOOK PERFORMANCE METRICS ==========\n");
    console.log("Total processing time:", metrics.total, "ms");
    console.log("Breakdown:");
    console.log("  - DB Connection:", metrics.dbConnection, "ms");
    console.log("  - Find Transaction:", metrics.findTransaction, "ms");
    console.log("  - Update Transaction:", metrics.updateTransaction, "ms");
    console.log("  - Get Customer:", metrics.getCustomer, "ms");
    console.log("  - Update Balance:", metrics.updateBalance, "ms");
    console.log("  - Balance Transaction:", metrics.balanceTransaction, "ms");
    console.log("  - Recharge Record:", metrics.rechargeRecord, "ms");
    console.log("  - SSE Notification:", metrics.sseNotification, "ms");
    console.log("  - Bonus Processing:", metrics.bonusProcessing, "ms");
    console.log("=================================================\n\n");

    return res.status(200).json({ success: true, metrics });
  } catch (error) {
    console.error("\n\n========== PIX WEBHOOK ERROR ==========\n");
    console.error("[PIX Webhook] Error processing webhook:");
    console.error("Error message:", error instanceof Error ? error.message : String(error));
    console.error("Error stack:", error instanceof Error ? error.stack : "No stack trace");
    console.error("Error object:", error);
    console.error("========================================\n\n");
    return res.status(500).json({ error: "Internal server error", message: error instanceof Error ? error.message : String(error) });
  }
});

export default router;
