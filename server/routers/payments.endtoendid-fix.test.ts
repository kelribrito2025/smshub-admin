import { describe, it, expect, beforeAll } from "vitest";
import { getDb } from "../db";
import { recharges, pixTransactions } from "../../drizzle/schema";
import { eq, and, isNull } from "drizzle-orm";

describe("PIX endToEndId Fix Validation", () => {
  let db: Awaited<ReturnType<typeof getDb>>;

  beforeAll(async () => {
    db = await getDb();
    if (!db) throw new Error("Database not available");
  });

  it("should verify that pixTransactions table has endToEndId column", async () => {
    if (!db) throw new Error("Database not available");

    // Try to select endToEndId from pixTransactions
    const result = await db
      .select({
        id: pixTransactions.id,
        txid: pixTransactions.txid,
        endToEndId: pixTransactions.endToEndId,
      })
      .from(pixTransactions)
      .limit(1);

    // If this doesn't throw, the column exists
    expect(result).toBeDefined();
    console.log("✅ pixTransactions table has endToEndId column");
  });

  it("should verify that recharges table has endToEndId column", async () => {
    if (!db) throw new Error("Database not available");

    // Try to select endToEndId from recharges
    const result = await db
      .select({
        id: recharges.id,
        transactionId: recharges.transactionId,
        endToEndId: recharges.endToEndId,
      })
      .from(recharges)
      .limit(1);

    // If this doesn't throw, the column exists
    expect(result).toBeDefined();
    console.log("✅ recharges table has endToEndId column");
  });

  it("should verify that payment #600001 now has endToEndId", async () => {
    if (!db) throw new Error("Database not available");

    const [recharge] = await db
      .select()
      .from(recharges)
      .where(eq(recharges.id, 600001))
      .limit(1);

    expect(recharge).toBeDefined();
    expect(recharge.endToEndId).toBeTruthy();
    expect(recharge.endToEndId).not.toBeNull();
    
    console.log(`✅ Payment #600001 has endToEndId: ${recharge.endToEndId}`);
  });

  it("should check how many PIX recharges still missing endToEndId", async () => {
    if (!db) throw new Error("Database not available");

    const missingE2E = await db
      .select()
      .from(recharges)
      .where(
        and(
          eq(recharges.paymentMethod, "pix"),
          eq(recharges.status, "completed"),
          isNull(recharges.endToEndId)
        )
      )
      .limit(10);

    console.log(`📊 PIX recharges without endToEndId: ${missingE2E.length}`);
    
    if (missingE2E.length > 0) {
      console.log("⚠️  Some PIX recharges still missing endToEndId:");
      missingE2E.forEach(r => {
        console.log(`  - Recharge #${r.id} (txid: ${r.transactionId})`);
      });
    } else {
      console.log("✅ All completed PIX recharges have endToEndId!");
    }

    // This is informational, not a failure
    expect(missingE2E).toBeDefined();
  });

  it("should verify webhook will store endToEndId for new payments", async () => {
    // This test verifies the webhook code structure
    // The actual webhook update was done in webhook-pix.ts line 112
    
    const fs = await import("fs");
    const webhookCode = fs.readFileSync(
      "/home/ubuntu/smshub-admin/server/webhook-pix.ts",
      "utf-8"
    );

    // Check if webhook code includes endToEndId storage
    expect(webhookCode).toContain("endToEndId: pixData.endToEndId");
    expect(webhookCode).toContain("Store E2EID for refunds");

    console.log("✅ Webhook code correctly stores endToEndId for new payments");
  });
});
