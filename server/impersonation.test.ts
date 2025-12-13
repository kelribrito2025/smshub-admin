import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { appRouter } from "./routers";
import type { Context } from "./_core/context";
import { getDb } from "./db";
import { users, customers, impersonationLogs } from "../drizzle/schema";
import { eq } from "drizzle-orm";

describe("Impersonation Flow", () => {
  let testAdminId: number;
  let testCustomerId: number;
  let impersonationToken: string;

  beforeAll(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    // Create test admin user with impersonation permission
    const adminResult = await db.insert(users).values({
      openId: "test-admin-impersonate",
      name: "Test Admin",
      email: "admin@test.com",
      role: "admin",
      permissions: JSON.stringify(["support:impersonate"]),
    });
    testAdminId = Number(adminResult[0].insertId);

    // Create test customer
    const customerResult = await db.insert(customers).values({
      pin: 99999,
      name: "Test Customer",
      email: "customer@test.com",
      balance: 1000,
    });
    testCustomerId = Number(customerResult[0].insertId);
  });

  afterAll(async () => {
    const db = await getDb();
    if (!db) return;

    // Cleanup test data
    await db.delete(impersonationLogs).where(eq(impersonationLogs.adminId, testAdminId));
    await db.delete(users).where(eq(users.id, testAdminId));
    await db.delete(customers).where(eq(customers.id, testCustomerId));
  });

  it("should generate impersonation token for admin with permission", async () => {
    const mockContext: Context = {
      user: {
        id: testAdminId,
        openId: "test-admin-impersonate",
        name: "Test Admin",
        email: "admin@test.com",
        role: "admin",
        permissions: JSON.stringify(["support:impersonate"]),
        loginMethod: "oauth",
        createdAt: new Date(),
        updatedAt: new Date(),
        lastSignedIn: new Date(),
      },
      req: {
        ip: "127.0.0.1",
        headers: {
          "user-agent": "test-agent",
        },
        cookies: {},
      } as any,
      res: {
        cookie: () => {},
        clearCookie: () => {},
      } as any,
    };

    const caller = appRouter.createCaller(mockContext);
    const result = await caller.impersonation.generateToken({
      customerId: testCustomerId,
    });

    expect(result).toBeDefined();
    expect(result.token).toBeDefined();
    expect(result.customerId).toBe(testCustomerId);
    expect(result.customerName).toBe("Test Customer");
    expect(result.customerEmail).toBe("customer@test.com");

    // Save token for next test
    impersonationToken = result.token;

    // Verify log was created
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const logs = await db
      .select()
      .from(impersonationLogs)
      .where(eq(impersonationLogs.token, impersonationToken))
      .limit(1);

    expect(logs.length).toBe(1);
    expect(logs[0].adminId).toBe(testAdminId);
    expect(logs[0].customerId).toBe(testCustomerId);
    expect(logs[0].status).toBe("active");
  });

  it("should reject impersonation for admin without permission", async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    // Create admin without permission
    const noPermAdminResult = await db.insert(users).values({
      openId: "test-admin-no-perm",
      name: "Admin No Permission",
      email: "noperm@test.com",
      role: "admin",
      permissions: null,
    });
    const noPermAdminId = Number(noPermAdminResult[0].insertId);

    const mockContext: Context = {
      user: {
        id: noPermAdminId,
        openId: "test-admin-no-perm",
        name: "Admin No Permission",
        email: "noperm@test.com",
        role: "admin",
        permissions: null,
        loginMethod: "oauth",
        createdAt: new Date(),
        updatedAt: new Date(),
        lastSignedIn: new Date(),
      },
      req: {
        ip: "127.0.0.1",
        headers: {
          "user-agent": "test-agent",
        },
        cookies: {},
      } as any,
      res: {
        cookie: () => {},
        clearCookie: () => {},
      } as any,
    };

    const caller = appRouter.createCaller(mockContext);

    await expect(
      caller.impersonation.generateToken({
        customerId: testCustomerId,
      })
    ).rejects.toThrow("permissão");

    // Cleanup
    await db.delete(users).where(eq(users.id, noPermAdminId));
  });

  it("should validate impersonation token and create support session", async () => {
    const mockContext: Context = {
      user: null,
      req: {
        ip: "127.0.0.1",
        headers: {
          "user-agent": "test-agent",
        },
        cookies: {},
      } as any,
      res: {
        cookie: (name: string, value: string, options: any) => {
          // Verify support session cookie is set
          expect(name).toBe("support_session");
          expect(value).toBeDefined();
        },
        clearCookie: () => {},
      } as any,
    };

    const caller = appRouter.createCaller(mockContext);
    const result = await caller.impersonation.validateToken({
      token: impersonationToken,
    });

    expect(result).toBeDefined();
    expect(result.success).toBe(true);
    expect(result.customer.id).toBe(testCustomerId);
    expect(result.customer.name).toBe("Test Customer");
    expect(result.customer.email).toBe("customer@test.com");
    expect(result.customer.pin).toBe(99999);
    expect(result.customer.balance).toBe(1000);
    expect(result.customer.active).toBe(true);
    expect(result.customer.banned).toBe(false);
    expect(result.admin.id).toBe(testAdminId);
  });

  it("should reject invalid or expired token", async () => {
    const mockContext: Context = {
      user: null,
      req: {
        ip: "127.0.0.1",
        headers: {
          "user-agent": "test-agent",
        },
        cookies: {},
      } as any,
      res: {
        cookie: () => {},
        clearCookie: () => {},
      } as any,
    };

    const caller = appRouter.createCaller(mockContext);

    await expect(
      caller.impersonation.validateToken({
        token: "invalid-token-12345",
      })
    ).rejects.toThrow();
  });

  it("should not allow token reuse", async () => {
    // Mark token as used (ended)
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    await db
      .update(impersonationLogs)
      .set({ status: "ended", endedAt: new Date() })
      .where(eq(impersonationLogs.token, impersonationToken));

    const mockContext: Context = {
      user: null,
      req: {
        ip: "127.0.0.1",
        headers: {
          "user-agent": "test-agent",
        },
        cookies: {},
      } as any,
      res: {
        cookie: () => {},
        clearCookie: () => {},
      } as any,
    };

    const caller = appRouter.createCaller(mockContext);

    await expect(
      caller.impersonation.validateToken({
        token: impersonationToken,
      })
    ).rejects.toThrow();
  });
});
