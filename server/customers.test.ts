import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAdminContext(): { ctx: TrpcContext } {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "admin-user",
    email: "admin@example.com",
    name: "Admin User",
    loginMethod: "manus",
    role: "admin",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  const ctx: TrpcContext = {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };

  return { ctx };
}

describe("Customer Management", () => {
  it("should allow admin to create customer", async () => {
    const { ctx } = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.customers.create({
      name: "Test Customer",
      email: `test${Date.now()}@example.com`,
      balance: 10.50,
      active: true,
    });

    expect(result).toEqual({ success: true });
  });

  it("should prevent duplicate email", async () => {
    const { ctx } = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const email = `duplicate${Date.now()}@example.com`;

    // Create first customer
    await caller.customers.create({
      name: "First Customer",
      email,
      balance: 0,
      active: true,
    });

    // Try to create second with same email
    await expect(
      caller.customers.create({
        name: "Second Customer",
        email,
        balance: 0,
        active: true,
      })
    ).rejects.toThrow("Email already registered");
  });

  it("should get all customers", async () => {
    const { ctx } = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const customers = await caller.customers.getAll();
    expect(Array.isArray(customers)).toBe(true);
  });

  it("should get customer statistics", async () => {
    const { ctx } = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const stats = await caller.customers.getStats();
    
    expect(stats).toHaveProperty("totalCustomers");
    expect(stats).toHaveProperty("activeCustomers");
    expect(stats).toHaveProperty("totalBalance");
    expect(stats).toHaveProperty("averageBalance");
    expect(typeof stats.totalCustomers).toBe("number");
  });
});

describe("Balance Management", () => {
  it("should add balance to customer", async () => {
    const { ctx } = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    // Create a customer first
    const email = `balance${Date.now()}@example.com`;
    await caller.customers.create({
      name: "Balance Test",
      email,
      balance: 0,
      active: true,
    });

    const customer = await caller.customers.getByEmail({ email });
    expect(customer).not.toBeNull();

    if (customer) {
      // Add balance
      const result = await caller.customers.addBalance({
        customerId: customer.id,
        amount: 50.00,
        type: "credit",
        description: "Test credit",
      });

      expect(result.success).toBe(true);
      expect(result.balanceAfter).toBe(50.00);
    }
  });

  it("should deduct balance from customer", async () => {
    const { ctx } = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    // Create a customer with initial balance
    const email = `debit${Date.now()}@example.com`;
    await caller.customers.create({
      name: "Debit Test",
      email,
      balance: 100.00,
      active: true,
    });

    const customer = await caller.customers.getByEmail({ email });
    expect(customer).not.toBeNull();

    if (customer) {
      // Deduct balance
      const result = await caller.customers.addBalance({
        customerId: customer.id,
        amount: -30.00,
        type: "debit",
        description: "Test debit",
      });

      expect(result.success).toBe(true);
      expect(result.balanceAfter).toBe(70.00);
    }
  });

  it("should retrieve customer transactions", async () => {
    const { ctx } = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    // Create a customer
    const email = `transactions${Date.now()}@example.com`;
    await caller.customers.create({
      name: "Transaction Test",
      email,
      balance: 0,
      active: true,
    });

    const customer = await caller.customers.getByEmail({ email });
    expect(customer).not.toBeNull();

    if (customer) {
      // Add some transactions
      await caller.customers.addBalance({
        customerId: customer.id,
        amount: 25.00,
        type: "credit",
        description: "First transaction",
      });

      await caller.customers.addBalance({
        customerId: customer.id,
        amount: 15.00,
        type: "credit",
        description: "Second transaction",
      });

      // Get transactions
      const transactions = await caller.customers.getTransactions({
        customerId: customer.id,
        limit: 10,
      });

      expect(Array.isArray(transactions)).toBe(true);
      expect(transactions.length).toBeGreaterThanOrEqual(2);
    }
  });
});

describe("Customer Update and Toggle", () => {
  it("should update customer information", async () => {
    const { ctx } = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    // Create a customer
    const email = `update${Date.now()}@example.com`;
    await caller.customers.create({
      name: "Original Name",
      email,
      balance: 0,
      active: true,
    });

    const customer = await caller.customers.getByEmail({ email });
    expect(customer).not.toBeNull();

    if (customer) {
      // Update customer
      const result = await caller.customers.update({
        id: customer.id,
        name: "Updated Name",
      });

      expect(result).toEqual({ success: true });

      // Verify update
      const updated = await caller.customers.getById({ id: customer.id });
      expect(updated?.name).toBe("Updated Name");
    }
  });

  it("should toggle customer active status", async () => {
    const { ctx } = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    // Create a customer
    const email = `toggle${Date.now()}@example.com`;
    await caller.customers.create({
      name: "Toggle Test",
      email,
      balance: 0,
      active: true,
    });

    const customer = await caller.customers.getByEmail({ email });
    expect(customer).not.toBeNull();

    if (customer) {
      // Toggle active status
      const result = await caller.customers.toggleActive({
        id: customer.id,
      });

      expect(result.success).toBe(true);
      expect(result.active).toBe(false);

      // Verify toggle
      const updated = await caller.customers.getById({ id: customer.id });
      expect(updated?.active).toBe(false);
    }
  });
});
