import { describe, expect, it, beforeAll } from "vitest";
import { appRouter } from "./routers";
import type { Context } from "./_core/context";
import bcrypt from "bcrypt";
import { getDb } from "./db";
import { users } from "../drizzle/schema";
import { eq } from "drizzle-orm";

describe("Admin Authentication", () => {
  const testEmail = "admin@test.com";
  const testPassword = "TestPassword123";
  let testUserId: number;

  // Setup: Create test admin user with password
  beforeAll(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    // Create or update test admin user
    const passwordHash = await bcrypt.hash(testPassword, 10);
    
    // Check if user exists
    const [existingUser] = await db
      .select()
      .from(users)
      .where(eq(users.email, testEmail))
      .limit(1);

    if (existingUser) {
      // Update existing user
      await db
        .update(users)
        .set({ passwordHash, role: "admin" })
        .where(eq(users.id, existingUser.id));
      testUserId = existingUser.id;
    } else {
      // Create new user
      const [result] = await db
        .insert(users)
        .values({
          openId: `test-admin-${Date.now()}`,
          email: testEmail,
          name: "Test Admin",
          passwordHash,
          role: "admin",
          loginMethod: "password",
        })
        .$returningId();
      testUserId = result.id;
    }
  });

  it("should login with correct credentials", async () => {
    const mockReq = {
      headers: {},
      protocol: "https",
    } as any;
    const mockRes = {
      cookie: () => {},
      clearCookie: () => {},
    } as any;

    const ctx: Context = {
      req: mockReq,
      res: mockRes,
      user: null,
    };

    const caller = appRouter.createCaller(ctx);

    const result = await caller.adminAuth.login({
      email: testEmail,
      password: testPassword,
    });

    expect(result.success).toBe(true);
    expect(result.user).toBeDefined();
    expect(result.user.email).toBe(testEmail);
    expect(result.user.role).toBe("admin");
  });

  it("should fail login with incorrect password", async () => {
    const mockReq = {
      headers: {},
      protocol: "https",
    } as any;
    const mockRes = {
      cookie: () => {},
      clearCookie: () => {},
    } as any;

    const ctx: Context = {
      req: mockReq,
      res: mockRes,
      user: null,
    };

    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.adminAuth.login({
        email: testEmail,
        password: "WrongPassword123",
      })
    ).rejects.toThrow("Email ou senha inválidos");
  });

  it("should fail login with non-existent email", async () => {
    const mockReq = {
      headers: {},
      protocol: "https",
    } as any;
    const mockRes = {
      cookie: () => {},
      clearCookie: () => {},
    } as any;

    const ctx: Context = {
      req: mockReq,
      res: mockRes,
      user: null,
    };

    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.adminAuth.login({
        email: "nonexistent@test.com",
        password: testPassword,
      })
    ).rejects.toThrow("Email ou senha inválidos");
  });

  it("should set password for admin user", async () => {
    const mockReq = {
      headers: {},
      protocol: "https",
    } as any;
    const mockRes = {
      cookie: () => {},
      clearCookie: () => {},
    } as any;

    const ctx: Context = {
      req: mockReq,
      res: mockRes,
      user: null,
    };

    const caller = appRouter.createCaller(ctx);
    const newPassword = "NewPassword456";

    const result = await caller.adminAuth.setPassword({
      userId: testUserId,
      password: newPassword,
    });

    expect(result.success).toBe(true);

    // Verify new password works
    const loginResult = await caller.adminAuth.login({
      email: testEmail,
      password: newPassword,
    });

    expect(loginResult.success).toBe(true);
  });
});
