import { describe, it, expect, beforeAll } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import { getDb } from "./db";
import { users } from "../drizzle/schema";
import { eq } from "drizzle-orm";

describe("Navigation Layout Preferences", () => {
  let testUserId: number;
  let caller: ReturnType<typeof appRouter.createCaller>;

  beforeAll(async () => {
    const db = await getDb();
    if (!db) {
      throw new Error("Database not available for testing");
    }

    // Create a test user
    const [existingUser] = await db
      .select()
      .from(users)
      .where(eq(users.openId, "test-nav-layout-user"))
      .limit(1);

    if (existingUser) {
      testUserId = existingUser.id;
    } else {
      const result = await db.insert(users).values({
        openId: "test-nav-layout-user",
        name: "Test Nav Layout User",
        email: "test-nav@example.com",
        role: "user",
        navLayout: "sidebar", // Default layout
      });
      testUserId = Number(result[0].insertId);
    }

    // Create a mock context with the test user
    const mockContext: TrpcContext = {
      req: {} as any,
      res: {} as any,
      user: {
        id: testUserId,
        openId: "test-nav-layout-user",
        name: "Test Nav Layout User",
        email: "test-nav@example.com",
        role: "user",
        permissions: null,
        loginMethod: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastSignedIn: new Date(),
        navLayout: "sidebar",
      },
    };

    caller = appRouter.createCaller(mockContext);
  });

  it("should get default navigation layout (sidebar)", async () => {
    const layout = await caller.auth.getNavLayout();
    expect(layout).toBe("sidebar");
  });

  it("should update navigation layout to top", async () => {
    const result = await caller.auth.updateNavLayout({ navLayout: "top" });
    expect(result.success).toBe(true);

    // Verify the update
    const updatedLayout = await caller.auth.getNavLayout();
    expect(updatedLayout).toBe("top");
  });

  it("should update navigation layout back to sidebar", async () => {
    const result = await caller.auth.updateNavLayout({ navLayout: "sidebar" });
    expect(result.success).toBe(true);

    // Verify the update
    const updatedLayout = await caller.auth.getNavLayout();
    expect(updatedLayout).toBe("sidebar");
  });

  it("should persist navigation layout preference in database", async () => {
    // Update to top
    await caller.auth.updateNavLayout({ navLayout: "top" });

    // Query database directly to verify persistence
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const [user] = await db
      .select({ navLayout: users.navLayout })
      .from(users)
      .where(eq(users.id, testUserId));

    expect(user.navLayout).toBe("top");
  });
});
