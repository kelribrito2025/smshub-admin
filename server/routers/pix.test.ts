import { describe, it, expect, beforeAll } from "vitest";
import { appRouter } from "../routers";
import { getDb } from "../db";
import { customers, pixTransactions } from "../../drizzle/schema";
import { eq } from "drizzle-orm";

describe("PIX Router", () => {
  let testCustomerId: number;
  let testTxid: string;

  beforeAll(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    // Check if test customer already exists
    const existing = await db
      .select()
      .from(customers)
      .where(eq(customers.email, "test-pix@example.com"))
      .limit(1);

    if (existing.length > 0) {
      testCustomerId = existing[0].id;
    } else {
      // Create test customer
      const result = await db.insert(customers).values({
        name: "Test PIX Customer",
        email: "test-pix@example.com",
        balance: 1000, // R$ 10.00
        pin: 99999,
        active: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      testCustomerId = Number(result.insertId);
    }

    console.log("Test customer ID:", testCustomerId);
  });

  it("should create a PIX charge", async () => {
    const caller = appRouter.createCaller({
      user: null,
      customer: { id: testCustomerId, email: "test-pix@example.com" } as any,
    });

    const result = await caller.pix.createCharge({
      customerId: testCustomerId,
      amount: 5000, // R$ 50.00
    });

    expect(result).toHaveProperty("txid");
    expect(result).toHaveProperty("pixCopyPaste");
    expect(result).toHaveProperty("qrCodeUrl");
    expect(result).toHaveProperty("expiresAt");
    expect(result.txid).toBeTruthy();
    expect(result.pixCopyPaste).toBeTruthy();

    testTxid = result.txid;
  });

  it("should get transaction by txid", async () => {
    const caller = appRouter.createCaller({
      user: null,
      customer: { id: testCustomerId, email: "test-pix@example.com" } as any,
    });

    const transaction = await caller.pix.getTransaction({
      txid: testTxid,
      customerId: testCustomerId,
    });

    expect(transaction).toBeTruthy();
    expect(transaction?.txid).toBe(testTxid);
    expect(transaction?.customerId).toBe(testCustomerId);
    expect(transaction?.amount).toBe(5000);
    expect(transaction?.status).toBe("pending");
  });

  it("should list customer transactions", async () => {
    const caller = appRouter.createCaller({
      user: null,
      customer: { id: testCustomerId, email: "test-pix@example.com" } as any,
    });

    const transactions = await caller.pix.listTransactions({
      customerId: testCustomerId,
    });

    expect(Array.isArray(transactions)).toBe(true);
    expect(transactions.length).toBeGreaterThan(0);
    expect(transactions[0]).toHaveProperty("txid");
    expect(transactions[0]).toHaveProperty("amount");
    expect(transactions[0]).toHaveProperty("status");
  });

  it("should reject charge creation without authentication", async () => {
    const caller = appRouter.createCaller({
      user: null,
      customer: null,
    });

    await expect(
      caller.pix.createCharge({
        customerId: testCustomerId,
        amount: 1000,
      })
    ).rejects.toThrow();
  });

  it("should reject charge creation with invalid amount", async () => {
    const caller = appRouter.createCaller({
      user: null,
      customer: { id: testCustomerId, email: "test-pix@example.com" } as any,
    });

    await expect(
      caller.pix.createCharge({
        customerId: testCustomerId,
        amount: 0,
      })
    ).rejects.toThrow("Amount must be greater than 0");
  });

  it("should reject charge creation with amount below minimum", async () => {
    const caller = appRouter.createCaller({
      user: null,
      customer: { id: testCustomerId, email: "test-pix@example.com" } as any,
    });

    await expect(
      caller.pix.createCharge({
        customerId: testCustomerId,
        amount: 50, // R$ 0.50 - below minimum of R$ 1.00
      })
    ).rejects.toThrow("Minimum amount is R$ 1,00");
  });
});
