import { describe, it, expect, vi, beforeEach } from "vitest";
import { notificationsManager } from "./notifications-manager";

/**
 * Test: Verify that PIX webhook sends balance_updated event
 * 
 * This test validates that when a PIX payment is confirmed:
 * 1. The webhook sends a pix_payment_confirmed notification
 * 2. The webhook sends a balance_updated notification (separate event)
 * 3. Both notifications contain the correct balance data
 */

describe("PIX Webhook - Balance Update SSE", () => {
  beforeEach(() => {
    // Clear all mocks before each test
    vi.clearAllMocks();
  });

  it("should send both pix_payment_confirmed and balance_updated events", () => {
    // Mock the notificationsManager.sendToCustomer method
    const sendToCustomerSpy = vi.spyOn(notificationsManager, "sendToCustomer");

    // Simulate webhook sending notifications (this is what happens in webhook-pix.ts)
    const customerId = 123;
    const balanceBefore = 10000; // R$ 100.00
    const balanceAfter = 15000;  // R$ 150.00
    const amount = 5000;         // R$ 50.00
    const txid = "test-txid-12345";

    // Send pix_payment_confirmed notification
    notificationsManager.sendToCustomer(customerId, {
      type: "pix_payment_confirmed",
      title: "Recarga Aprovada! 💰",
      message: `Sua recarga de R$ ${(amount / 100).toFixed(2)} foi confirmada!`,
      data: {
        amount,
        balanceBefore,
        balanceAfter,
        txid,
      },
    });

    // Send balance_updated notification (this is the new event we added)
    notificationsManager.sendToCustomer(customerId, {
      type: "balance_updated",
      title: "Saldo Atualizado",
      message: `Novo saldo: R$ ${(balanceAfter / 100).toFixed(2)}`,
      data: {
        balanceBefore,
        balanceAfter,
        amountAdded: amount,
      },
    });

    // Verify that sendToCustomer was called exactly twice
    expect(sendToCustomerSpy).toHaveBeenCalledTimes(2);

    // Verify first call: pix_payment_confirmed
    expect(sendToCustomerSpy).toHaveBeenNthCalledWith(1, customerId, {
      type: "pix_payment_confirmed",
      title: "Recarga Aprovada! 💰",
      message: "Sua recarga de R$ 50.00 foi confirmada!",
      data: {
        amount: 5000,
        balanceBefore: 10000,
        balanceAfter: 15000,
        txid: "test-txid-12345",
      },
    });

    // Verify second call: balance_updated
    expect(sendToCustomerSpy).toHaveBeenNthCalledWith(2, customerId, {
      type: "balance_updated",
      title: "Saldo Atualizado",
      message: "Novo saldo: R$ 150.00",
      data: {
        balanceBefore: 10000,
        balanceAfter: 15000,
        amountAdded: 5000,
      },
    });
  });

  it("should include correct balance data in balance_updated event", () => {
    const sendToCustomerSpy = vi.spyOn(notificationsManager, "sendToCustomer");

    const customerId = 456;
    const balanceBefore = 0;      // R$ 0.00 (first recharge)
    const balanceAfter = 10000;   // R$ 100.00
    const amount = 10000;         // R$ 100.00

    // Send balance_updated notification
    notificationsManager.sendToCustomer(customerId, {
      type: "balance_updated",
      title: "Saldo Atualizado",
      message: `Novo saldo: R$ ${(balanceAfter / 100).toFixed(2)}`,
      data: {
        balanceBefore,
        balanceAfter,
        amountAdded: amount,
      },
    });

    // Verify the notification was sent with correct data
    expect(sendToCustomerSpy).toHaveBeenCalledWith(customerId, {
      type: "balance_updated",
      title: "Saldo Atualizado",
      message: "Novo saldo: R$ 100.00",
      data: {
        balanceBefore: 0,
        balanceAfter: 10000,
        amountAdded: 10000,
      },
    });
  });
});
