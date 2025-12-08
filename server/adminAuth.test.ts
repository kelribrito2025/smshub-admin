import { describe, it, expect } from "vitest";
import { appRouter } from "./routers";
import { getDb } from "./db";
import { users } from "../drizzle/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcrypt";

describe("Admin Authentication", () => {
  it("should login with correct credentials", async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    // Find an admin user
    const [admin] = await db
      .select()
      .from(users)
      .where(eq(users.role, "admin"))
      .limit(1);

    if (!admin) {
      console.log("⚠️  No admin user found, skipping test");
      return;
    }

    // Set a test password
    const testPassword = "TestPassword123";
    const passwordHash = await bcrypt.hash(testPassword, 10);
    await db
      .update(users)
      .set({ passwordHash })
      .where(eq(users.id, admin.id));

    // Create a mock context
    const mockReq = {
      protocol: "https",
      headers: {},
    } as any;
    const mockRes = {
      cookie: () => {},
      clearCookie: () => {},
    } as any;

    const caller = appRouter.createCaller({
      req: mockReq,
      res: mockRes,
      user: null,
    });

    // Test login
    const result = await caller.adminAuth.login({
      email: admin.email!,
      password: testPassword,
    });

    expect(result).toHaveProperty("id");
    expect(result).toHaveProperty("email");
    expect(result.role).toBe("admin");
  });

  it("should fail login with incorrect password", async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    // Find an admin user
    const [admin] = await db
      .select()
      .from(users)
      .where(eq(users.role, "admin"))
      .limit(1);

    if (!admin) {
      console.log("⚠️  No admin user found, skipping test");
      return;
    }

    // Create a mock context
    const mockReq = {
      protocol: "https",
      headers: {},
    } as any;
    const mockRes = {
      cookie: () => {},
      clearCookie: () => {},
    } as any;

    const caller = appRouter.createCaller({
      req: mockReq,
      res: mockRes,
      user: null,
    });

    // Test login with wrong password
    await expect(
      caller.adminAuth.login({
        email: admin.email!,
        password: "WrongPassword123",
      })
    ).rejects.toThrow();
  });

  it("should fail login with non-existent email", async () => {
    const mockReq = {
      protocol: "https",
      headers: {},
    } as any;
    const mockRes = {
      cookie: () => {},
      clearCookie: () => {},
    } as any;

    const caller = appRouter.createCaller({
      req: mockReq,
      res: mockRes,
      user: null,
    });

    // Test login with non-existent email
    await expect(
      caller.adminAuth.login({
        email: "nonexistent@example.com",
        password: "SomePassword123",
      })
    ).rejects.toThrow();
  });

  it("should set password for admin user", async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    // Find an admin user
    const [admin] = await db
      .select()
      .from(users)
      .where(eq(users.role, "admin"))
      .limit(1);

    if (!admin) {
      console.log("⚠️  No admin user found, skipping test");
      return;
    }

    const mockReq = {
      protocol: "https",
      headers: {},
    } as any;
    const mockRes = {
      cookie: () => {},
      clearCookie: () => {},
    } as any;

    const caller = appRouter.createCaller({
      req: mockReq,
      res: mockRes,
      user: null,
    });

    // Set password
    const newPassword = "NewPassword123";
    const result = await caller.adminAuth.setPassword({
      email: admin.email!,
      password: newPassword,
    });

    expect(result.success).toBe(true);

    // Verify password was set correctly
    const [updatedUser] = await db
      .select()
      .from(users)
      .where(eq(users.id, admin.id))
      .limit(1);

    expect(updatedUser.passwordHash).toBeTruthy();
    
    // Verify password hash is valid
    const isValid = await bcrypt.compare(newPassword, updatedUser.passwordHash!);
    expect(isValid).toBe(true);
  });
});
