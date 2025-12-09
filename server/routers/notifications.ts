import { router, publicProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { notifications } from "../../drizzle/schema";
import { eq, desc, and } from "drizzle-orm";
import { z } from "zod";

/**
 * Notifications Router
 * Handles notification history and management
 */

export const notificationsRouter = router({
  /**
   * Get all notifications for the current customer
   */
  getAll: publicProcedure.query(async ({ ctx }) => {
    if (!ctx.user) {
      return [];
    }

    const db = await getDb();
    if (!db) {
      return [];
    }
    const customerNotifications = await db
      .select()
      .from(notifications)
      .where(eq(notifications.customerId, ctx.user.id))
      .orderBy(desc(notifications.createdAt))
      .limit(50); // Last 50 notifications

    return customerNotifications.map((notif: any) => ({
      id: notif.id,
      type: mapNotificationTypeToUIType(notif.type),
      title: notif.title,
      message: notif.message,
      timestamp: formatTimestamp(notif.createdAt),
      isRead: notif.isRead,
      data: notif.data ? JSON.parse(notif.data) : undefined,
    }));
  }),

  /**
   * Mark a notification as read
   */
  markAsRead: publicProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      if (!ctx.user) {
        throw new Error("Unauthorized");
      }

      const db = await getDb();
      if (!db) {
        throw new Error("Database not available");
      }
      await db
        .update(notifications)
        .set({ isRead: true })
        .where(eq(notifications.id, input.id));

      return { success: true };
    }),

  /**
   * Mark all notifications as read
   */
  markAllAsRead: publicProcedure.mutation(async ({ ctx }) => {
    if (!ctx.user) {
      throw new Error("Unauthorized");
    }

    const db = await getDb();
    if (!db) {
      throw new Error("Database not available");
    }
    await db
      .update(notifications)
      .set({ isRead: true })
      .where(eq(notifications.customerId, ctx.user.id));

    return { success: true };
  }),

  /**
   * Get unread count
   */
  getUnreadCount: publicProcedure.query(async ({ ctx }) => {
    if (!ctx.user) {
      return 0;
    }

    const db = await getDb();
    if (!db) {
      return 0;
    }
    const unreadNotifications = await db
      .select()
      .from(notifications)
      .where(
        and(
          eq(notifications.customerId, ctx.user.id),
          eq(notifications.isRead, false)
        )
      );

    return unreadNotifications.length;
  }),
});

/**
 * Map backend notification type to UI type
 */
function mapNotificationTypeToUIType(
  type: string
): "info" | "warning" | "success" | "error" {
  switch (type) {
    case "pix_payment_confirmed":
    case "balance_updated":
    case "operation_completed":
      return "success";
    case "operation_failed":
    case "activation_expired":
      return "error";
    case "operation_started":
      return "info";
    default:
      return "info";
  }
}

/**
 * Format timestamp to relative time (e.g., "2 min atrás")
 */
function formatTimestamp(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSeconds < 60) {
    return "agora mesmo";
  } else if (diffMinutes < 60) {
    return `${diffMinutes} min atrás`;
  } else if (diffHours < 24) {
    return `${diffHours} hora${diffHours > 1 ? "s" : ""} atrás`;
  } else if (diffDays < 7) {
    return `${diffDays} dia${diffDays > 1 ? "s" : ""} atrás`;
  } else {
    return date.toLocaleDateString("pt-BR");
  }
}
