import { describe, it, expect, beforeAll } from "vitest";
import { appRouter } from "../routers";
import type { Context } from "../_core/context";
import { getDb } from "../db";
import { adminMenus } from "../../drizzle/schema";
import { eq } from "drizzle-orm";

// Mock admin context
const createMockAdminContext = (): Context => ({
  user: {
    id: 1,
    openId: "test-admin",
    name: "Admin Test",
    email: "admin@test.com",
    loginMethod: "email",
    role: "admin" as const,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  },
  req: {} as any,
  res: {} as any,
});

describe("Admin Menus Router", () => {
  let testMenuId: number;

  beforeAll(async () => {
    // Clean up any test menus
    const db = await getDb();
    if (db) {
      await db.delete(adminMenus).where(eq(adminMenus.label, "Test Menu"));
    }
  });

  it("should get all active menus", async () => {
    const caller = appRouter.createCaller(createMockAdminContext());
    const menus = await caller.adminMenus.getAll();

    expect(Array.isArray(menus)).toBe(true);
    expect(menus.length).toBeGreaterThan(0);
    expect(menus[0]).toHaveProperty("label");
    expect(menus[0]).toHaveProperty("path");
    expect(menus[0]).toHaveProperty("position");
  });

  it("should create a new menu item", async () => {
    const caller = appRouter.createCaller(createMockAdminContext());
    
    const result = await caller.adminMenus.create({
      label: "Test Menu",
      path: "/test-menu",
      icon: "TestIcon",
    });

    expect(result.success).toBe(true);

    // Verify it was created
    const menus = await caller.adminMenus.getAll();
    const createdMenu = menus.find((m) => m.label === "Test Menu");
    expect(createdMenu).toBeDefined();
    expect(createdMenu?.path).toBe("/test-menu");
    
    if (createdMenu) {
      testMenuId = createdMenu.id;
    }
  });

  it("should delete a menu item", async () => {
    const caller = appRouter.createCaller(createMockAdminContext());

    if (!testMenuId) {
      throw new Error("Test menu not created");
    }

    const result = await caller.adminMenus.delete({ id: testMenuId });
    expect(result.success).toBe(true);
  });
});
