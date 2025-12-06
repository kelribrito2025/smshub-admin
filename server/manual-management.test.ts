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

function createNonAdminContext(): { ctx: TrpcContext } {
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

  return { ctx };
}

describe("Manual Country Management", () => {
  it("should allow admin to create country", async () => {
    const { ctx } = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.countries.create({
      smshubId: 999,
      name: "Test Country",
      code: "TC",
      active: true,
      markupPercentage: 10,
      markupFixed: 50,
    });

    expect(result).toEqual({ success: true });
  });

  it("should allow admin to update country", async () => {
    const { ctx } = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    // First create a country
    await caller.countries.create({
      smshubId: 998,
      name: "Update Test",
      code: "UT",
      active: true,
      markupPercentage: 0,
      markupFixed: 0,
    });

    // Then update it
    const result = await caller.countries.update({
      id: 1,
      name: "Updated Name",
      markupPercentage: 20,
    });

    expect(result).toEqual({ success: true });
  });

  it("should reject non-admin from creating country", async () => {
    const { ctx } = createNonAdminContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.countries.create({
        smshubId: 997,
        name: "Forbidden",
        code: "FB",
        active: true,
        markupPercentage: 0,
        markupFixed: 0,
      })
    ).rejects.toThrow("Admin access required");
  });
});

describe("Manual Service Management", () => {
  it("should allow admin to create service", async () => {
    const { ctx } = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.services.create({
      smshubCode: "test_service",
      name: "Test Service",
      category: "Social",
      active: true,
      markupPercentage: 15,
      markupFixed: 100,
    });

    expect(result).toEqual({ success: true });
  });

  it("should allow admin to update service", async () => {
    const { ctx } = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.services.update({
      id: 1,
      name: "Updated Service",
      category: "Finance",
      markupPercentage: 25,
    });

    expect(result).toEqual({ success: true });
  });

  it("should reject non-admin from creating service", async () => {
    const { ctx } = createNonAdminContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.services.create({
        smshubCode: "forbidden",
        name: "Forbidden Service",
        active: true,
        markupPercentage: 0,
        markupFixed: 0,
      })
    ).rejects.toThrow("Admin access required");
  });
});

describe("Price Management", () => {
  it("should allow admin to upsert price", async () => {
    const { ctx } = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.prices.upsert({
      countryId: 1,
      serviceId: 1,
      smshubPrice: 100,
      ourPrice: 150,
      quantityAvailable: 50,
    });

    expect(result).toEqual({ success: true });
  });

  it("should allow admin to update only our price", async () => {
    const { ctx } = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    // First create a price
    await caller.prices.upsert({
      countryId: 1,
      serviceId: 1,
      smshubPrice: 100,
      ourPrice: 150,
      quantityAvailable: 50,
    });

    // Then update only our price
    const result = await caller.prices.updateOurPrice({
      countryId: 1,
      serviceId: 1,
      ourPrice: 200,
    });

    expect(result).toEqual({ success: true });
  });
});
