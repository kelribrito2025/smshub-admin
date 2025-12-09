import { describe, it, expect, beforeEach } from "vitest";
import { appRouter } from "../routers";
import { getDb } from "../db";
import { notifications, customers } from "../../drizzle/schema";
import { eq } from "drizzle-orm";

/**
 * Test suite for notifications router
 * 
 * Tests:
 * 1. Get all notifications for a customer
 * 2. Mark notification as read
 * 3. Mark all notifications as read
 * 4. Get unread count
 */

describe("Notifications Router", () => {
  let testCustomerId: number;
  let testNotificationId: number;

  beforeEach(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    // Find or create test customer
    const existingCustomers = await db
      .select()
      .from(customers)
      .limit(1);

    if (existingCustomers.length > 0) {
      testCustomerId = existingCustomers[0].id;
    } else {
      throw new Error("No customers found in database for testing");
    }

    // Create test notification
    const [notification] = await db.insert(notifications).values({
      customerId: testCustomerId,
      type: "pix_payment_confirmed",
      title: "Test Notification",
      message: "This is a test notification",
      data: JSON.stringify({ test: true }),
      isRead: false,
    });

    testNotificationId = notification.insertId;
  });

  it("should get all notifications for a customer", async () => {
    const caller = appRouter.createCaller({
      user: { id: testCustomerId, openId: "test", name: "Test User", role: "user" },
      req: {} as any,
      res: {} as any,
    });

    const result = await caller.notifications.getAll();

    expect(result).toBeDefined();
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
    
    const testNotif = result.find(n => n.id === testNotificationId);
    expect(testNotif).toBeDefined();
    expect(testNotif?.title).toBe("Test Notification");
    expect(testNotif?.message).toBe("This is a test notification");
    expect(testNotif?.type).toBe("success"); // pix_payment_confirmed maps to success
    expect(testNotif?.isRead).toBe(false);
  });

  it("should mark notification as read", async () => {
    const caller = appRouter.createCaller({
      user: { id: testCustomerId, openId: "test", name: "Test User", role: "user" },
      req: {} as any,
      res: {} as any,
    });

    const result = await caller.notifications.markAsRead({ id: testNotificationId });

    expect(result.success).toBe(true);

    // Verify notification is marked as read
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const [notification] = await db
      .select()
      .from(notifications)
      .where(eq(notifications.id, testNotificationId));

    expect(notification.isRead).toBe(true);
  });

  it("should mark all notifications as read", async () => {
    const caller = appRouter.createCaller({
      user: { id: testCustomerId, openId: "test", name: "Test User", role: "user" },
      req: {} as any,
      res: {} as any,
    });

    const result = await caller.notifications.markAllAsRead();

    expect(result.success).toBe(true);

    // Verify all notifications are marked as read
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const unreadNotifications = await db
      .select()
      .from(notifications)
      .where(eq(notifications.customerId, testCustomerId))
      .where(eq(notifications.isRead, false));

    expect(unreadNotifications.length).toBe(0);
  });

  it("should get unread count", async () => {
    const caller = appRouter.createCaller({
      user: { id: testCustomerId, openId: "test", name: "Test User", role: "user" },
      req: {} as any,
      res: {} as any,
    });

    const count = await caller.notifications.getUnreadCount();

    expect(typeof count).toBe("number");
    expect(count).toBeGreaterThanOrEqual(0);
  });

  it("should return empty array for unauthenticated user", async () => {
    const caller = appRouter.createCaller({
      user: null,
      req: {} as any,
      res: {} as any,
    });

    const result = await caller.notifications.getAll();

    expect(result).toEqual([]);
  });

  it("should return 0 unread count for unauthenticated user", async () => {
    const caller = appRouter.createCaller({
      user: null,
      req: {} as any,
      res: {} as any,
    });

    const count = await caller.notifications.getUnreadCount();

    expect(count).toBe(0);
  });
});
