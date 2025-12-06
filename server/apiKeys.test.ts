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

describe("API Keys Management", () => {
  it("should allow admin to create API key", async () => {
    const { ctx } = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.apiKeys.create({
      name: "Test API Key",
    });

    expect(result.success).toBe(true);
    expect(result.key).toBeDefined();
    expect(result.key).toMatch(/^sk_/);
  });

  it("should list all API keys", async () => {
    const { ctx } = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const apiKeys = await caller.apiKeys.getAll();

    expect(Array.isArray(apiKeys)).toBe(true);
  });

  it("should reject non-admin users from creating API keys", async () => {
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

    await expect(
      caller.apiKeys.create({
        name: "Test API Key",
      })
    ).rejects.toThrow();
  });
});
