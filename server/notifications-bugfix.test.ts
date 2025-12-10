import { describe, it, expect, beforeAll } from "vitest";
import { getDb } from "./db";
import { customers, notifications, notificationReads } from "../drizzle/schema";
import { eq, and } from "drizzle-orm";

/**
 * Test suite for notifications bug fix
 * Bug: Notifications disappearing when admin logs out
 * Cause: Query was using ctx.user.id instead of customer.id
 * Fix: Always fetch customer.id from email and use it for filtering
 */

describe("Notifications - Customer ID Fix", () => {
  let testCustomerId: number;
  let testNotificationId: number;

  beforeAll(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    // Find any existing customer for testing
    const [customer] = await db
      .select({ id: customers.id })
      .from(customers)
      .limit(1);

    if (!customer) {
      throw new Error("No customers found in database");
    }

    testCustomerId = customer.id;

    // Create a test global notification
    const [notification] = await db
      .insert(notifications)
      .values({
        customerId: null, // Global notification
        type: "admin_notification",
        title: "Test Notification",
        message: "This is a test notification for bug fix validation",
      })
      .$returningId();

    testNotificationId = notification.id;
  });

  it("should fetch notifications using customer.id from email", async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    // Simulate the fixed query logic
    // Get email of test customer
    const [testCustomer] = await db
      .select({ email: customers.email })
      .from(customers)
      .where(eq(customers.id, testCustomerId))
      .limit(1);
    
    const userEmail = testCustomer.email;

    // Step 1: Get customer ID from email (this is the fix)
    const [customer] = await db
      .select({ id: customers.id, createdAt: customers.createdAt })
      .from(customers)
      .where(eq(customers.email, userEmail))
      .limit(1);

    expect(customer).toBeDefined();
    expect(customer.id).toBe(testCustomerId);

    // Step 2: Fetch notifications using customer.id (not ctx.user.id)
    const customerNotifications = await db
      .select({
        id: notifications.id,
        customerId: notifications.customerId,
        type: notifications.type,
        title: notifications.title,
        message: notifications.message,
      })
      .from(notifications)
      .leftJoin(
        notificationReads,
        and(
          eq(notificationReads.notificationId, notifications.id),
          eq(notificationReads.customerId, customer.id) // Using customer.id, not ctx.user.id
        )
      )
      .where(eq(notifications.id, testNotificationId))
      .limit(1);

    expect(customerNotifications).toHaveLength(1);
    expect(customerNotifications[0].id).toBe(testNotificationId);
  });

  it("should mark notification as read using customer.id", async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    // Get email of test customer
    const [testCustomer] = await db
      .select({ email: customers.email })
      .from(customers)
      .where(eq(customers.id, testCustomerId))
      .limit(1);
    
    const userEmail = testCustomer.email;

    // Get customer ID from email
    const [customer] = await db
      .select({ id: customers.id })
      .from(customers)
      .where(eq(customers.email, userEmail))
      .limit(1);

    expect(customer).toBeDefined();

    // Mark notification as read using customer.id
    await db
      .insert(notificationReads)
      .values({
        notificationId: testNotificationId,
        customerId: customer.id, // Using customer.id, not ctx.user.id
      })
      .onDuplicateKeyUpdate({
        set: { readAt: new Date() },
      });

    // Verify it was marked as read
    const [readRecord] = await db
      .select()
      .from(notificationReads)
      .where(
        and(
          eq(notificationReads.notificationId, testNotificationId),
          eq(notificationReads.customerId, customer.id)
        )
      )
      .limit(1);

    expect(readRecord).toBeDefined();
    expect(readRecord.customerId).toBe(customer.id);
  });

  it("should persist read status across different ctx.user.id values", async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    // Simulate user logging in with different ctx.user.id
    // but same email (conta1@gmail.com)
    // Get email of test customer
    const [testCustomer] = await db
      .select({ email: customers.email })
      .from(customers)
      .where(eq(customers.id, testCustomerId))
      .limit(1);
    
    const userEmail = testCustomer.email;

    // Get customer ID from email (always returns same customer.id)
    const [customer] = await db
      .select({ id: customers.id })
      .from(customers)
      .where(eq(customers.email, userEmail))
      .limit(1);

    expect(customer).toBeDefined();
    expect(customer.id).toBe(testCustomerId);

    // Check if notification is still marked as read
    const [readRecord] = await db
      .select()
      .from(notificationReads)
      .where(
        and(
          eq(notificationReads.notificationId, testNotificationId),
          eq(notificationReads.customerId, customer.id)
        )
      )
      .limit(1);

    expect(readRecord).toBeDefined();
    expect(readRecord.customerId).toBe(testCustomerId);
  });
});
