import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { getDb } from "./db";
import { notifications, notificationReads, customers } from "../drizzle/schema";
import { eq, and, isNull, sql } from "drizzle-orm";

/**
 * Tests for Notification System with Individual Read State
 * 
 * This test suite validates that:
 * 1. Each user has their own read state for notifications
 * 2. Global notifications can be marked as read independently by different users
 * 3. Individual notifications are only visible to the target user
 * 4. Unread counts are calculated correctly per user
 */

describe("Notification System - Individual Read State", () => {
  let db: Awaited<ReturnType<typeof getDb>>;
  let testCustomer1Id: number;
  let testCustomer2Id: number;
  let globalNotificationId: number;
  let individualNotificationId: number;

  beforeAll(async () => {
    db = await getDb();
    if (!db) {
      throw new Error("Database not available");
    }

    // Create two test customers
    const [customer1] = await db.insert(customers).values({
      name: "Test Customer 1",
      email: `test-notif-user1-${Date.now()}@example.com`,
      pin: Math.floor(100000 + Math.random() * 900000),
      balance: 0,
    });
    testCustomer1Id = customer1.insertId;

    const [customer2] = await db.insert(customers).values({
      name: "Test Customer 2",
      email: `test-notif-user2-${Date.now()}@example.com`,
      pin: Math.floor(100000 + Math.random() * 900000),
      balance: 0,
    });
    testCustomer2Id = customer2.insertId;

    // Create a global notification (customerId = NULL)
    const [globalNotif] = await db.insert(notifications).values({
      customerId: null,
      type: "admin_notification",
      title: "Global Test Notification",
      message: "This is a test global notification",
    });
    globalNotificationId = globalNotif.insertId;

    // Create an individual notification for customer1
    const [individualNotif] = await db.insert(notifications).values({
      customerId: testCustomer1Id,
      type: "balance_updated",
      title: "Individual Test Notification",
      message: "This is a test individual notification",
    });
    individualNotificationId = individualNotif.insertId;
  });

  afterAll(async () => {
    if (!db) return;

    // Cleanup: delete test data
    await db.delete(notificationReads).where(
      eq(notificationReads.notificationId, globalNotificationId)
    );
    await db.delete(notificationReads).where(
      eq(notificationReads.notificationId, individualNotificationId)
    );
    await db.delete(notifications).where(eq(notifications.id, globalNotificationId));
    await db.delete(notifications).where(eq(notifications.id, individualNotificationId));
    await db.delete(customers).where(eq(customers.id, testCustomer1Id));
    await db.delete(customers).where(eq(customers.id, testCustomer2Id));
  });

  it("should allow customer1 to mark global notification as read without affecting customer2", async () => {
    // Customer1 marks global notification as read
    await db!.insert(notificationReads).values({
      notificationId: globalNotificationId,
      customerId: testCustomer1Id,
    });

    // Check customer1's read state
    const customer1Read = await db!
      .select()
      .from(notificationReads)
      .where(
        and(
          eq(notificationReads.notificationId, globalNotificationId),
          eq(notificationReads.customerId, testCustomer1Id)
        )
      );

    expect(customer1Read.length).toBe(1);
    expect(customer1Read[0].customerId).toBe(testCustomer1Id);

    // Check customer2's read state (should be empty)
    const customer2Read = await db!
      .select()
      .from(notificationReads)
      .where(
        and(
          eq(notificationReads.notificationId, globalNotificationId),
          eq(notificationReads.customerId, testCustomer2Id)
        )
      );

    expect(customer2Read.length).toBe(0);
  });

  it("should allow customer2 to independently mark the same global notification as read", async () => {
    // Customer2 marks global notification as read
    await db!.insert(notificationReads).values({
      notificationId: globalNotificationId,
      customerId: testCustomer2Id,
    });

    // Check customer2's read state
    const customer2Read = await db!
      .select()
      .from(notificationReads)
      .where(
        and(
          eq(notificationReads.notificationId, globalNotificationId),
          eq(notificationReads.customerId, testCustomer2Id)
        )
      );

    expect(customer2Read.length).toBe(1);
    expect(customer2Read[0].customerId).toBe(testCustomer2Id);

    // Verify both customers have independent read records
    const allReads = await db!
      .select()
      .from(notificationReads)
      .where(eq(notificationReads.notificationId, globalNotificationId));

    expect(allReads.length).toBe(2);
    const customerIds = allReads.map((r) => r.customerId).sort();
    expect(customerIds).toEqual([testCustomer1Id, testCustomer2Id].sort());
  });

  it("should maintain only one read record per user-notification pair", async () => {
    // Get initial count of read records for customer1 + globalNotification
    const initialReads = await db!
      .select()
      .from(notificationReads)
      .where(
        and(
          eq(notificationReads.notificationId, globalNotificationId),
          eq(notificationReads.customerId, testCustomer1Id)
        )
      );

    const initialCount = initialReads.length;
    expect(initialCount).toBe(1); // Should have 1 record from previous test

    // Try to insert duplicate read record for customer1 using onDuplicateKeyUpdate
    await db!.insert(notificationReads).values({
      notificationId: globalNotificationId,
      customerId: testCustomer1Id,
    }).onDuplicateKeyUpdate({
      set: { readAt: sql`CURRENT_TIMESTAMP` },
    });

    // Verify still only 1 record exists (no duplicate created)
    const finalReads = await db!
      .select()
      .from(notificationReads)
      .where(
        and(
          eq(notificationReads.notificationId, globalNotificationId),
          eq(notificationReads.customerId, testCustomer1Id)
        )
      );

    expect(finalReads.length).toBe(1); // Should still be 1 record
  });

  it("should only allow target customer to see individual notification", async () => {
    // Verify individual notification has correct customerId
    const individualNotif = await db!
      .select()
      .from(notifications)
      .where(eq(notifications.id, individualNotificationId));

    expect(individualNotif.length).toBe(1);
    expect(individualNotif[0].customerId).toBe(testCustomer1Id);
  });

  it("should calculate unread count correctly per user", async () => {
    // Create a new unread notification for testing
    const [unreadNotif] = await db!.insert(notifications).values({
      customerId: null,
      type: "admin_notification",
      title: "Unread Test Notification",
      message: "This should be unread",
    });
    const unreadNotifId = unreadNotif.insertId;

    try {
      // Count unread for customer1 (should include new notification)
      const unreadCount = await db!
        .select({ count: sql<number>`COUNT(*)` })
        .from(notifications)
        .leftJoin(
          notificationReads,
          and(
            eq(notificationReads.notificationId, notifications.id),
            eq(notificationReads.customerId, testCustomer1Id)
          )
        )
        .where(
          and(
            eq(notifications.id, unreadNotifId),
            isNull(notificationReads.id) // No read record = unread
          )
        );

      expect(unreadCount[0].count).toBe(1);
    } finally {
      // Cleanup
      await db!.delete(notifications).where(eq(notifications.id, unreadNotifId));
    }
  });

  it("should correctly join notifications with read state for a user", async () => {
    // Query notifications with read state for customer1
    const notificationsWithReadState = await db!
      .select({
        id: notifications.id,
        title: notifications.title,
        readAt: notificationReads.readAt,
      })
      .from(notifications)
      .leftJoin(
        notificationReads,
        and(
          eq(notificationReads.notificationId, notifications.id),
          eq(notificationReads.customerId, testCustomer1Id)
        )
      )
      .where(eq(notifications.id, globalNotificationId));

    expect(notificationsWithReadState.length).toBe(1);
    expect(notificationsWithReadState[0].id).toBe(globalNotificationId);
    expect(notificationsWithReadState[0].readAt).not.toBeNull(); // Customer1 already marked as read
  });
});
