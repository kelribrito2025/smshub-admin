import { describe, it, expect, beforeAll } from "vitest";
import { appRouter } from "../routers";
import { getDb } from "../db";
import { notifications } from "../../drizzle/schema";
import { isNull, desc } from "drizzle-orm";

/**
 * Tests for admin notification system
 * 
 * Test scenarios:
 * 1. Admin can send global notification (customerId = NULL)
 * 2. Non-admin users cannot send notifications
 */

describe("Admin Notifications", () => {
  let adminCaller: ReturnType<typeof appRouter.createCaller>;
  let userCaller: ReturnType<typeof appRouter.createCaller>;

  beforeAll(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    // Create admin caller
    adminCaller = appRouter.createCaller({
      user: {
        id: 1,
        openId: "admin-open-id",
        name: "Admin User",
        email: "admin@test.com",
        role: "admin",
        createdAt: new Date(),
        updatedAt: new Date(),
        lastSignedIn: new Date(),
        loginMethod: "oauth",
      },
      req: {} as any,
      res: {} as any,
    });

    // Create regular user caller
    userCaller = appRouter.createCaller({
      user: {
        id: 2,
        openId: "user-open-id",
        name: "Regular User",
        email: "user@test.com",
        role: "user",
        createdAt: new Date(),
        updatedAt: new Date(),
        lastSignedIn: new Date(),
        loginMethod: "oauth",
      },
      req: {} as any,
      res: {} as any,
    });
  });

  it("should allow admin to send global notification", async () => {
    const result = await adminCaller.notifications.sendAdminNotification({
      title: "Manutenção Programada",
      message: "O sistema estará em manutenção das 02:00 às 04:00",
    });

    expect(result.success).toBe(true);
    expect(result.message).toContain("global");

    // Verify notification was created in database with NULL customerId
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const globalNotifications = await db
      .select()
      .from(notifications)
      .where(isNull(notifications.customerId))
      .orderBy(desc(notifications.createdAt))
      .limit(1);

    expect(globalNotifications.length).toBeGreaterThan(0);
    expect(globalNotifications[0].title).toBe("Manutenção Programada");
    expect(globalNotifications[0].type).toBe("admin_notification");
  });

  it("should reject non-admin users from sending notifications", async () => {
    await expect(
      userCaller.notifications.sendAdminNotification({
        title: "Tentativa não autorizada",
        message: "Usuário comum tentando enviar notificação",
      })
    ).rejects.toThrow("apenas administradores");
  });
});
