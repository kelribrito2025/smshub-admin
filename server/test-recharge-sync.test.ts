import { describe, it, expect } from "vitest";
import { getDb } from "./db";
import { recharges, pixTransactions, customers } from "../drizzle/schema";
import { eq } from "drizzle-orm";

/**
 * Teste para validar que todas as transações PIX pagas têm registro correspondente em recharges
 */
describe("PIX Recharge Synchronization", () => {
  it("should have recharge record for all paid PIX transactions", async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    // Buscar todas as transações PIX pagas
    const paidPixTransactions = await db
      .select()
      .from(pixTransactions)
      .where(eq(pixTransactions.status, "paid"));

    console.log(`Found ${paidPixTransactions.length} paid PIX transactions`);

    // Para cada transação PIX paga, verificar se existe registro em recharges
    for (const pixTx of paidPixTransactions) {
      const rechargeRecord = await db
        .select()
        .from(recharges)
        .where(eq(recharges.transactionId, pixTx.txid))
        .limit(1);

      expect(
        rechargeRecord.length,
        `PIX transaction ${pixTx.txid} (amount: ${pixTx.amount}) should have a recharge record`
      ).toBeGreaterThan(0);

      if (rechargeRecord.length > 0) {
        const recharge = rechargeRecord[0];
        
        // Validar que os dados estão corretos
        expect(recharge.customerId).toBe(pixTx.customerId);
        expect(recharge.amount).toBe(pixTx.amount);
        expect(recharge.paymentMethod).toBe("pix");
        expect(recharge.status).toBe("completed");
        
        console.log(`✅ PIX ${pixTx.txid} has matching recharge record #${recharge.id}`);
      }
    }
  });

  it("should find the specific R$ 5.55 recharge for xkelrix@gmail.com", async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    // Buscar cliente xkelrix
    const customerResult = await db
      .select()
      .from(customers)
      .where(eq(customers.email, "xkelrix@gmail.com"))
      .limit(1);

    expect(customerResult.length).toBeGreaterThan(0);
    const customer = customerResult[0];

    // Buscar transação PIX de 555 centavos (R$ 5.55)
    const pixTxResult = await db
      .select()
      .from(pixTransactions)
      .where(eq(pixTransactions.amount, 555))
      .limit(1);

    expect(pixTxResult.length).toBeGreaterThan(0);
    const pixTx = pixTxResult[0];

    console.log(`Found PIX transaction:`, {
      id: pixTx.id,
      customerId: pixTx.customerId,
      amount: pixTx.amount,
      status: pixTx.status,
      txid: pixTx.txid,
    });

    // Buscar registro de recarga correspondente
    const rechargeResult = await db
      .select()
      .from(recharges)
      .where(eq(recharges.transactionId, pixTx.txid))
      .limit(1);

    expect(
      rechargeResult.length,
      "R$ 5.55 PIX transaction should have a recharge record"
    ).toBeGreaterThan(0);

    const recharge = rechargeResult[0];
    console.log(`Found recharge record:`, {
      id: recharge.id,
      customerId: recharge.customerId,
      amount: recharge.amount,
      paymentMethod: recharge.paymentMethod,
      status: recharge.status,
    });

    expect(recharge.customerId).toBe(customer.id);
    expect(recharge.amount).toBe(555);
    expect(recharge.paymentMethod).toBe("pix");
    expect(recharge.status).toBe("completed");
  });
});
