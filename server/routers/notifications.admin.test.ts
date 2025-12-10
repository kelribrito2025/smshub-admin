import { describe, it, expect, beforeAll } from "vitest";
import { appRouter } from "../routers";
import { getDb } from "../db";
import { notifications, customers } from "../../drizzle/schema";
import { eq, isNull, desc } from "drizzle-orm";

/**
 * Tests for admin notification system
 * 
 * Test scenarios:
 * 1. Admin can send global notification (customerId = NULL)
 * 2. Admin can send individual notification by PIN
 * 3. Admin can send individual notification by email
 * 4. Non-admin users cannot send notifications
 */

describe("Admin Notifications", () => {
  let adminCaller: ReturnType<typeof appRouter.createCaller>;
  let userCaller: ReturnType<typeof appRouter.createCaller>;
  let testCustomerId: number;

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

    // Get a test customer for individual notifications
    const testCustomers = await db
      .select()
      .from(customers)
      .limit(1);
    
    if (testCustomers.length > 0) {
      testCustomerId = testCustomers[0].id;
    }
  });

  it("should allow admin to send global notification", async () => {
    const result = await adminCaller.notifications.sendAdminNotification({
      title: "Manutenção Programada",
      message: "O sistema estará em manutenção das 02:00 às 04:00",
      type: "global",
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
      .orderBy(notifications.createdAt)
      .limit(1);

    expect(globalNotifications.length).toBeGreaterThan(0);
    expect(globalNotifications[0].title).toBe("Manutenção Programada");
    expect(globalNotifications[0].type).toBe("admin_notification");
  });

  it("should allow admin to send individual notification by PIN", async () => {
    if (!testCustomerId) {
      console.warn("No test customer available, skipping test");
      return;
    }

    const db = await getDb();
    if (!db) throw new Error("Database not available");

    // Get customer PIN
    const customer = await db
      .select()
      .from(customers)
      .where(eq(customers.id, testCustomerId))
      .limit(1);

    if (customer.length === 0) {
      console.warn("Test customer not found, skipping test");
      return;
    }

    const pin = customer[0].pin.toString();

    const result = await adminCaller.notifications.sendAdminNotification({
      title: "Notificação Individual",
      message: "Esta é uma notificação apenas para você",
      type: "individual",
      pinOrEmail: pin,
    });

    expect(result.success).toBe(true);
    expect(result.message).toContain(pin);

    // Verify notification was created with correct customerId
    const individualNotifications = await db
      .select()
      .from(notifications)
      .where(eq(notifications.customerId, testCustomerId))
      .orderBy(desc(notifications.createdAt))
      .limit(1);

    expect(individualNotifications.length).toBeGreaterThan(0);
    expect(individualNotifications[0].title).toBe("Notificação Individual");
  });

  it("should allow admin to send individual notification by email", async () => {
    if (!testCustomerId) {
      console.warn("No test customer available, skipping test");
      return;
    }

    const db = await getDb();
    if (!db) throw new Error("Database not available");

    // Get customer email
    const customer = await db
      .select()
      .from(customers)
      .where(eq(customers.id, testCustomerId))
      .limit(1);

    if (customer.length === 0) {
      console.warn("Test customer not found, skipping test");
      return;
    }

    const email = customer[0].email;

    const result = await adminCaller.notifications.sendAdminNotification({
      title: "Notificação por E-mail",
      message: "Enviado via e-mail",
      type: "individual",
      pinOrEmail: email,
    });

    expect(result.success).toBe(true);
    expect(result.message).toContain(email);
  });

  it("should reject non-admin users from sending notifications", async () => {
    await expect(
      userCaller.notifications.sendAdminNotification({
        title: "Tentativa não autorizada",
        message: "Usuário comum tentando enviar notificação",
        type: "global",
      })
    ).rejects.toThrow("apenas administradores");
  });

  it("should reject individual notification without PIN or email", async () => {
    await expect(
      adminCaller.notifications.sendAdminNotification({
        title: "Notificação sem destinatário",
        message: "Falta PIN ou e-mail",
        type: "individual",
        // pinOrEmail is missing
      })
    ).rejects.toThrow("PIN ou e-mail é obrigatório");
  });

  it("should reject notification with invalid PIN or email", async () => {
    await expect(
      adminCaller.notifications.sendAdminNotification({
        title: "Notificação inválida",
        message: "Cliente não existe",
        type: "individual",
        pinOrEmail: "99999999",
      })
    ).rejects.toThrow("Cliente não encontrado");
  });
});
