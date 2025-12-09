import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { appRouter } from "../routers";
import type { TrpcContext } from "../_core/trpc";
import type { Request, Response } from "express";

// Mock context for testing
function createMockContext(): TrpcContext {
  return {
    user: null,
    req: {
      headers: {
        origin: "http://localhost:3000",
      },
    } as Request,
    res: {} as Response,
  };
}

describe("Stripe Router", () => {
  const caller = appRouter.createCaller(createMockContext());

  it("should create checkout session with valid input", async () => {
    // Skip test if Stripe is not configured
    if (!process.env.STRIPE_SECRET_KEY) {
      console.log("⚠️  Skipping test: STRIPE_SECRET_KEY not configured");
      return;
    }

    const result = await caller.stripe.createCheckoutSession({
      customerId: 1,
      amount: 1000, // R$ 10,00
    });

    expect(result).toHaveProperty("checkoutUrl");
    expect(result).toHaveProperty("sessionId");
    expect(result.checkoutUrl).toContain("checkout.stripe.com");
  });

  it("should reject amount below minimum (R$ 1,00)", async () => {
    if (!process.env.STRIPE_SECRET_KEY) {
      console.log("⚠️  Skipping test: STRIPE_SECRET_KEY not configured");
      return;
    }

    await expect(
      caller.stripe.createCheckoutSession({
        customerId: 1,
        amount: 50, // R$ 0,50 - below minimum
      })
    ).rejects.toThrow();
  });

  it("should check session status", async () => {
    if (!process.env.STRIPE_SECRET_KEY) {
      console.log("⚠️  Skipping test: STRIPE_SECRET_KEY not configured");
      return;
    }

    // First create a session
    const session = await caller.stripe.createCheckoutSession({
      customerId: 1,
      amount: 1000,
    });

    // Then check its status
    const status = await caller.stripe.checkSessionStatus({
      sessionId: session.sessionId,
    });

    expect(status).toHaveProperty("status");
    expect(status.status).toBe("unpaid"); // New session should be unpaid
  });
});
