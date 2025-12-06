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

describe("Financial Reports", () => {
  it("should return financial metrics", async () => {
    const { ctx } = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const metrics = await caller.financial.getMetrics();

    expect(metrics).toBeDefined();
    expect(typeof metrics.totalRevenue).toBe("number");
    expect(typeof metrics.totalCost).toBe("number");
    expect(typeof metrics.totalProfit).toBe("number");
    expect(typeof metrics.totalActivations).toBe("number");
    expect(typeof metrics.profitMargin).toBe("number");
  });

  it("should return revenue by period", async () => {
    const { ctx } = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);
    const endDate = new Date();

    const revenue = await caller.financial.getRevenueByPeriod({
      startDate,
      endDate,
      groupBy: "day",
    });

    expect(Array.isArray(revenue)).toBe(true);
  });

  it("should return revenue by country", async () => {
    const { ctx } = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const revenue = await caller.financial.getRevenueByCountry();

    expect(Array.isArray(revenue)).toBe(true);
  });

  it("should return revenue by service", async () => {
    const { ctx } = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const revenue = await caller.financial.getRevenueByService();

    expect(Array.isArray(revenue)).toBe(true);
  });

  it("should return recent activations", async () => {
    const { ctx } = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const activations = await caller.financial.getRecentActivations({ limit: 10 });

    expect(Array.isArray(activations)).toBe(true);
  });

  it("should reject non-admin users from accessing financial data", async () => {
    const user: AuthenticatedUser = {
      id: 2,
      openId: "regular-user",
      email: "user@example.com",
      name: "Regular User",
      loginMethod: "manus",
      role: "user",
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

    const caller = appRouter.createCaller(ctx);

    await expect(caller.financial.getMetrics()).rejects.toThrow();
  });
});
