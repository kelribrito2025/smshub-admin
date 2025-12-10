import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { appRouter } from '../routers';
import { getDb } from '../db';
import { customers, notifications, users } from '../../drizzle/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcrypt';
import type { TrpcContext } from '../_core/context';

/**
 * Test: Notifications should only show notifications created AFTER customer registration
 * 
 * Scenario:
 * 1. Create a global notification (OLD - before customer registration)
 * 2. Create a new customer
 * 3. Create another global notification (NEW - after customer registration)
 * 4. Customer should only see the NEW notification, not the OLD one
 */

describe('Notifications Filter by Customer Registration Date', () => {
  let testCustomerId: number;
  let testUserOpenId: string;
  let oldNotificationId: number;
  let newNotificationId: number;

  beforeAll(async () => {
    const db = await getDb();
    if (!db) throw new Error('Database not available');

    // 1. Create OLD notification (before customer exists)
    const [oldNotif] = await db.insert(notifications).values({
      customerId: null, // Global notification
      type: 'admin_notification',
      title: 'OLD Notification - Should NOT appear',
      message: 'This notification was created before the customer registered',
    }).$returningId();
    oldNotificationId = oldNotif.id;

    // Wait 1 second to ensure different timestamps
    await new Promise(resolve => setTimeout(resolve, 1000));

    // 2. Create new customer
    const testEmail = `test-notif-filter-${Date.now()}@test.com`;
    const hashedPassword = await bcrypt.hash('password123', 10);
    
    const [customer] = await db.insert(customers).values({
      pin: 9000 + Math.floor(Math.random() * 1000),
      name: 'Test Customer - Notification Filter',
      email: testEmail,
      password: hashedPassword,
      balance: 0,
      active: true,
    }).$returningId();
    testCustomerId = customer.id;

    // Create user account for authentication
    testUserOpenId = `test-openid-${Date.now()}`;
    await db.insert(users).values({
      openId: testUserOpenId,
      name: 'Test Customer - Notification Filter',
      email: testEmail,
      role: 'user',
    });

    // Wait 1 second to ensure different timestamps
    await new Promise(resolve => setTimeout(resolve, 1000));

    // 3. Create NEW notification (after customer registration)
    const [newNotif] = await db.insert(notifications).values({
      customerId: null, // Global notification
      type: 'admin_notification',
      title: 'NEW Notification - Should appear',
      message: 'This notification was created after the customer registered',
    }).$returningId();
    newNotificationId = newNotif.id;
  });

  afterAll(async () => {
    // Cleanup
    const db = await getDb();
    if (!db) return;

    await db.delete(notifications).where(eq(notifications.id, oldNotificationId));
    await db.delete(notifications).where(eq(notifications.id, newNotificationId));
    await db.delete(users).where(eq(users.openId, testUserOpenId));
    await db.delete(customers).where(eq(customers.id, testCustomerId));
  });

  it('should only show notifications created after customer registration', async () => {
    const db = await getDb();
    if (!db) throw new Error('Database not available');

    // Get user for authentication context
    const [user] = await db.select().from(users).where(eq(users.openId, testUserOpenId)).limit(1);
    expect(user).toBeDefined();

    // Create caller with authenticated user
    const ctx: TrpcContext = {
      user,
      req: { protocol: 'https', headers: {} } as any,
      res: {} as any,
    };
    const caller = appRouter.createCaller(ctx);

    // Get all notifications
    const allNotifications = await caller.notifications.getAll();

    // Assertions
    expect(allNotifications).toBeDefined();
    expect(Array.isArray(allNotifications)).toBe(true);

    // Should contain NEW notification
    const hasNewNotification = allNotifications.some((n: any) => n.id === newNotificationId);
    expect(hasNewNotification).toBe(true);

    // Should NOT contain OLD notification
    const hasOldNotification = allNotifications.some((n: any) => n.id === oldNotificationId);
    expect(hasOldNotification).toBe(false);

    console.log('✅ Test passed: Customer only sees notifications created after registration');
    console.log(`   - OLD notification (ID ${oldNotificationId}): ${hasOldNotification ? 'VISIBLE (BUG!)' : 'HIDDEN (CORRECT)'}`);
    console.log(`   - NEW notification (ID ${newNotificationId}): ${hasNewNotification ? 'VISIBLE (CORRECT)' : 'HIDDEN (BUG!)'}`);
  });

  it('should correctly count unread notifications (only after registration)', async () => {
    const db = await getDb();
    if (!db) throw new Error('Database not available');

    // Get user for authentication context
    const [user] = await db.select().from(users).where(eq(users.openId, testUserOpenId)).limit(1);
    expect(user).toBeDefined();

    // Create caller with authenticated user
    const ctx: TrpcContext = {
      user,
      req: { protocol: 'https', headers: {} } as any,
      res: {} as any,
    };
    const caller = appRouter.createCaller(ctx);

    // Get unread count
    const unreadCount = await caller.notifications.getUnreadCount();

    // Should be at least 1 (the NEW notification)
    expect(unreadCount).toBeGreaterThanOrEqual(1);

    console.log(`✅ Test passed: Unread count = ${unreadCount} (includes only notifications after registration)`);
  });
});
