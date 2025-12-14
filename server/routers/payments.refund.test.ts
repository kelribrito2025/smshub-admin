import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { getDb } from "../db";
import { customers, recharges, refunds } from "../../drizzle/schema";
import { eq } from "drizzle-orm";

describe("PIX Refund System", () => {
  let db: Awaited<ReturnType<typeof getDb>>;
  let testCustomerId: number;
  let testRechargeId: number;

  beforeAll(async () => {
    db = await getDb();
    if (!db) throw new Error("Database not available");

    // Create test customer
    const [customerResult] = await db.insert(customers).values({
      pin: Math.floor(Math.random() * 1000000),
      name: "Test Customer Refund",
      email: `test-refund-${Date.now()}@example.com`,
      balance: 10000, // R$ 100.00
      active: true,
      createdAt: new Date(),
    });

    testCustomerId = customerResult.insertId;
  });

  afterAll(async () => {
    if (!db || !testCustomerId) return;

    // Cleanup: delete test data
    await db.delete(refunds).where(eq(refunds.customerId, testCustomerId));
    await db.delete(recharges).where(eq(recharges.customerId, testCustomerId));
    await db.delete(customers).where(eq(customers.id, testCustomerId));
  });

  it("should create recharge with endToEndId field", async () => {
    if (!db) throw new Error("Database not available");

    const testEndToEndId = "E18236120202109091000h123456789";
    const testTxid = `test-txid-${Date.now()}`;

    // Create test recharge with endToEndId
    const [rechargeResult] = await db.insert(recharges).values({
      customerId: testCustomerId,
      amount: 5000, // R$ 50.00
      paymentMethod: "pix",
      status: "completed",
      transactionId: testTxid,
      endToEndId: testEndToEndId,
      completedAt: new Date(),
      createdAt: new Date(),
    });

    testRechargeId = rechargeResult.insertId;

    // Verify recharge was created with endToEndId
    const [recharge] = await db
      .select()
      .from(recharges)
      .where(eq(recharges.id, testRechargeId));

    expect(recharge).toBeDefined();
    expect(recharge.endToEndId).toBe(testEndToEndId);
    expect(recharge.transactionId).toBe(testTxid);
    expect(recharge.paymentMethod).toBe("pix");
    expect(recharge.status).toBe("completed");
  });

  it("should validate endToEndId exists for PIX refunds", async () => {
    if (!db) throw new Error("Database not available");

    // Create recharge WITHOUT endToEndId (simulating old recharge)
    const [oldRechargeResult] = await db.insert(recharges).values({
      customerId: testCustomerId,
      amount: 3000, // R$ 30.00
      paymentMethod: "pix",
      status: "completed",
      transactionId: `old-txid-${Date.now()}`,
      // endToEndId is NULL
      completedAt: new Date(),
      createdAt: new Date(),
    });

    const oldRechargeId = oldRechargeResult.insertId;

    // Verify recharge was created without endToEndId
    const [oldRecharge] = await db
      .select()
      .from(recharges)
      .where(eq(recharges.id, oldRechargeId));

    expect(oldRecharge).toBeDefined();
    expect(oldRecharge.endToEndId).toBeNull();

    // Note: The actual validation happens in the tRPC procedure
    // This test just verifies the database schema supports NULL endToEndId
    // and that old recharges can exist without it
  });

  it("should have correct schema for refunds table with endToEndId", async () => {
    if (!db) throw new Error("Database not available");

    // Create a test refund record to verify schema
    const testEndToEndId = "E18236120202109091000h987654321";

    const [refundResult] = await db.insert(refunds).values({
      customerId: testCustomerId,
      rechargeId: testRechargeId,
      paymentMethod: "pix",
      amount: 2000, // R$ 20.00
      originalAmount: 5000, // R$ 50.00
      status: "pending",
      endToEndId: testEndToEndId,
      reason: "Test refund",
      processedBy: 1, // Admin user ID
      createdAt: new Date(),
    });

    const refundId = refundResult.insertId;

    // Verify refund was created with endToEndId
    const [refund] = await db
      .select()
      .from(refunds)
      .where(eq(refunds.id, refundId));

    expect(refund).toBeDefined();
    expect(refund.endToEndId).toBe(testEndToEndId);
    expect(refund.paymentMethod).toBe("pix");
    expect(refund.status).toBe("pending");
    expect(refund.amount).toBe(2000);
  });

  it("should support partial refunds", async () => {
    if (!db) throw new Error("Database not available");

    const originalAmount = 10000; // R$ 100.00
    const partialRefundAmount = 3000; // R$ 30.00

    // Create recharge
    const [rechargeResult] = await db.insert(recharges).values({
      customerId: testCustomerId,
      amount: originalAmount,
      paymentMethod: "pix",
      status: "completed",
      transactionId: `partial-test-${Date.now()}`,
      endToEndId: `E18236120202109091000h${Date.now()}`,
      completedAt: new Date(),
      createdAt: new Date(),
    });

    const rechargeId = rechargeResult.insertId;

    // Create partial refund
    const [refundResult] = await db.insert(refunds).values({
      customerId: testCustomerId,
      rechargeId: rechargeId,
      paymentMethod: "pix",
      amount: partialRefundAmount,
      originalAmount: originalAmount,
      status: "pending",
      endToEndId: `E18236120202109091000h${Date.now()}`,
      reason: "Partial refund test",
      processedBy: 1,
      createdAt: new Date(),
    });

    const refundId = refundResult.insertId;

    // Verify partial refund
    const [refund] = await db
      .select()
      .from(refunds)
      .where(eq(refunds.id, refundId));

    expect(refund).toBeDefined();
    expect(refund.amount).toBe(partialRefundAmount);
    expect(refund.originalAmount).toBe(originalAmount);
    expect(refund.amount).toBeLessThan(refund.originalAmount);
  });
});
