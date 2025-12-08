import { describe, it, expect, beforeAll } from "vitest";
import { getDb, getUserById } from "./db";
import { sdk } from "./_core/sdk";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import { users } from "../drizzle/schema";
import { eq } from "drizzle-orm";

const JWT_SECRET = process.env.JWT_SECRET || "test-secret";
const TEST_EMAIL = "admin@admin.com";
const TEST_PASSWORD = "290819943@KeL29081994337590064";

describe("Admin Login Flow Diagnosis", () => {
  let testUserId: number;
  let testToken: string;

  beforeAll(async () => {
    // Find the admin user
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const result = await db
      .select()
      .from(users)
      .where(eq(users.email, TEST_EMAIL))
      .limit(1);

    if (result.length === 0) {
      throw new Error(`User ${TEST_EMAIL} not found`);
    }

    testUserId = result[0].id;
    console.log("✅ Test user found:", { id: testUserId, email: TEST_EMAIL });
  });

  it("1. Should verify password hash exists", async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const result = await db
      .select()
      .from(users)
      .where(eq(users.id, testUserId))
      .limit(1);

    const user = result[0] as any;
    console.log("User passwordHash:", user.passwordHash ? "EXISTS" : "NULL");
    expect(user.passwordHash).toBeTruthy();
  });

  it("2. Should verify password with bcrypt", async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const result = await db
      .select()
      .from(users)
      .where(eq(users.id, testUserId))
      .limit(1);

    const user = result[0] as any;
    const isValid = await bcrypt.compare(TEST_PASSWORD, user.passwordHash);
    console.log("Password verification:", isValid ? "VALID" : "INVALID");
    expect(isValid).toBe(true);
  });

  it("3. Should generate JWT token correctly", () => {
    testToken = jwt.sign(
      {
        userId: testUserId,
        email: TEST_EMAIL,
        role: "admin",
      },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    console.log("Generated token:", testToken.substring(0, 50) + "...");
    expect(testToken).toBeTruthy();
  });

  it("4. Should decode JWT token correctly", () => {
    const decoded = jwt.verify(testToken, JWT_SECRET) as any;
    console.log("Decoded token:", {
      userId: decoded.userId,
      userIdType: typeof decoded.userId,
      email: decoded.email,
      role: decoded.role,
    });
    expect(decoded.userId).toBe(testUserId);
    expect(typeof decoded.userId).toBe("number");
  });

  it("5. Should verify admin JWT with sdk.verifyAdminJWT", async () => {
    const user = await sdk.verifyAdminJWT(testToken);
    console.log(
      "verifyAdminJWT result:",
      user ? `User found: ${user.email}` : "NULL"
    );
    expect(user).toBeTruthy();
    expect(user?.id).toBe(testUserId);
    expect(user?.email).toBe(TEST_EMAIL);
  });

  it("6. Should get user by ID", async () => {
    const user = await getUserById(testUserId);
    console.log(
      "getUserById result:",
      user ? `User found: ${user.email}` : "NULL"
    );
    expect(user).toBeTruthy();
    expect(user?.email).toBe(TEST_EMAIL);
  });

  it("7. Full flow simulation", async () => {
    console.log("\n=== FULL FLOW SIMULATION ===");

    // Step 1: Login (generate token)
    console.log("Step 1: Generate JWT token");
    const token = jwt.sign(
      {
        userId: testUserId,
        email: TEST_EMAIL,
        role: "admin",
      },
      JWT_SECRET,
      { expiresIn: "7d" }
    );
    console.log("✅ Token generated");

    // Step 2: Verify token with verifyAdminJWT
    console.log("\nStep 2: Verify token with verifyAdminJWT");
    const verifiedUser = await sdk.verifyAdminJWT(token);
    console.log(
      verifiedUser
        ? `✅ User verified: ${verifiedUser.email}`
        : "❌ Verification failed"
    );
    expect(verifiedUser).toBeTruthy();

    // Step 3: Simulate adminAuth.me call
    console.log("\nStep 3: Simulate adminAuth.me (should return user)");
    console.log(
      verifiedUser
        ? `✅ Would return: { id: ${verifiedUser.id}, email: ${verifiedUser.email}, role: ${verifiedUser.role} }`
        : "❌ Would return: null"
    );
    expect(verifiedUser?.email).toBe(TEST_EMAIL);

    console.log("\n=== FLOW COMPLETED SUCCESSFULLY ===\n");
  });
});
