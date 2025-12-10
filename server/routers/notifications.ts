import { router, publicProcedure, protectedProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { notifications, notificationReads, customers } from "../../drizzle/schema";
import { eq, desc, and, or, isNull, sql, gte } from "drizzle-orm";
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
    
    // Get customer's ID and createdAt to filter notifications
    const userEmail = ctx.user.email;
    if (!userEmail) {
      return [];
    }
    
    const [customer] = await db
      .select({ id: customers.id, createdAt: customers.createdAt })
      .from(customers)
      .where(eq(customers.email, userEmail))
      .limit(1);
    
    if (!customer) {
      return [];
    }
    
    // Get both user-specific and global notifications
    // LEFT JOIN with notification_reads to determine if user has read each notification
    // FILTER: Only show notifications created AFTER the customer's registration date
    // IMPORTANT: Use customer.id (not ctx.user.id) for filtering reads
    const customerNotifications = await db
      .select({
        id: notifications.id,
        customerId: notifications.customerId,
        type: notifications.type,
        title: notifications.title,
        message: notifications.message,
        data: notifications.data,
        createdAt: notifications.createdAt,
        readAt: notificationReads.readAt,
      })
      .from(notifications)
      .leftJoin(
        notificationReads,
        and(
          eq(notificationReads.notificationId, notifications.id),
          eq(notificationReads.customerId, customer.id)
        )
      )
      .where(
        and(
          or(
            eq(notifications.customerId, customer.id),
            isNull(notifications.customerId) // Global notifications
          ),
          gte(notifications.createdAt, customer.createdAt) // Only notifications after customer registration
        )
      )
      .orderBy(desc(notifications.createdAt))
      .limit(50); // Last 50 notifications

    return customerNotifications.map((notif: any) => ({
      id: notif.id,
      type: mapNotificationTypeToUIType(notif.type),
      title: notif.title,
      message: notif.message,
      timestamp: formatTimestamp(notif.createdAt),
      isRead: notif.readAt !== null, // If readAt exists, notification is read
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
      
      // Get customer ID from email
      const userEmail = ctx.user.email;
      if (!userEmail) {
        throw new Error("User email not found");
      }
      
      const [customer] = await db
        .select({ id: customers.id })
        .from(customers)
        .where(eq(customers.email, userEmail))
        .limit(1);
      
      if (!customer) {
        throw new Error("Customer not found");
      }
      
      // Insert a record in notification_reads (or ignore if already exists)
      await db
        .insert(notificationReads)
        .values({
          notificationId: input.id,
          customerId: customer.id,
        })
        .onDuplicateKeyUpdate({
          set: { readAt: sql`CURRENT_TIMESTAMP` },
        });

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
    
    // Get customer ID and createdAt from email
    const userEmail = ctx.user.email;
    if (!userEmail) {
      throw new Error("User email not found");
    }
    
    const [customer] = await db
      .select({ id: customers.id, createdAt: customers.createdAt })
      .from(customers)
      .where(eq(customers.email, userEmail))
      .limit(1);
    
    if (!customer) {
      throw new Error("Customer not found");
    }
    
    // Get all notifications visible to this user (user-specific + global)
    // FILTER: Only notifications created AFTER the customer's registration date
    const visibleNotifications = await db
      .select({ id: notifications.id })
      .from(notifications)
      .where(
        and(
          or(
            eq(notifications.customerId, customer.id),
            isNull(notifications.customerId) // Global notifications
          ),
          gte(notifications.createdAt, customer.createdAt) // Only notifications after customer registration
        )
      );

    // Insert read records for all visible notifications
    if (visibleNotifications.length > 0) {
      const readRecords = visibleNotifications.map((notif) => ({
        notificationId: notif.id,
        customerId: customer.id,
      }));

      // Use INSERT IGNORE to avoid duplicate key errors
      await db
        .insert(notificationReads)
        .values(readRecords)
        .onDuplicateKeyUpdate({
          set: { readAt: sql`CURRENT_TIMESTAMP` },
        });
    }

    return { success: true };
  }),

  /**
   * Send admin notification (global only)
   * Admin-only endpoint
   */
  sendAdminNotification: protectedProcedure
    .input(
      z.object({
        title: z.string().min(1, "Título é obrigatório"),
        message: z.string().min(1, "Descrição é obrigatória"),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // Check if user is admin
      if (ctx.user.role !== "admin") {
        throw new Error("Acesso negado: apenas administradores podem enviar notificações");
      }

      const db = await getDb();
      if (!db) {
        throw new Error("Database not available");
      }

      // Create global notification in database (customerId = NULL)
      console.log(`[Notifications] 💾 Salvando notificação GLOBAL no banco`);
      await db.insert(notifications).values({
        customerId: null, // NULL = global notification
        type: "admin_notification",
        title: input.title,
        message: input.message,
      });
      console.log(`[Notifications] ✅ Notificação salva no banco com sucesso`);

      // Send real-time notification via SSE to all users (exclude admins)
      const { notificationsManager } = await import("../notifications-manager");
      
      const sseNotification = {
        type: "admin_notification" as const,
        title: input.title,
        message: input.message,
      };

      console.log(`[Notifications] 📡 Enviando notificação GLOBAL via SSE para todos os USUÁRIOS conectados (excluindo admins)`);
      const stats = notificationsManager.getStats();
      console.log(`[Notifications] 📊 Clientes conectados: ${stats.totalConnections} (${stats.totalCustomers} usuários únicos)`);
      notificationsManager.sendToAllUsers(sseNotification);
      console.log(`[Notifications] ✅ Notificação GLOBAL enviada via SSE (apenas para usuários, admins excluídos)`);

      return {
        success: true,
        message: "Notificação global enviada com sucesso para todos os usuários",
      };
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
    
    // Get customer's ID and createdAt to filter notifications
    const userEmail = ctx.user.email;
    if (!userEmail) {
      return 0;
    }
    
    const [customer] = await db
      .select({ id: customers.id, createdAt: customers.createdAt })
      .from(customers)
      .where(eq(customers.email, userEmail))
      .limit(1);
    
    if (!customer) {
      return 0;
    }
    
    // Count notifications visible to this user that don't have a read record
    // FILTER: Only count notifications created AFTER the customer's registration date
    // IMPORTANT: Use customer.id (not ctx.user.id) for filtering reads
    const unreadCount = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(notifications)
      .leftJoin(
        notificationReads,
        and(
          eq(notificationReads.notificationId, notifications.id),
          eq(notificationReads.customerId, customer.id)
        )
      )
      .where(
        and(
          or(
            eq(notifications.customerId, customer.id),
            isNull(notifications.customerId) // Global notifications
          ),
          isNull(notificationReads.id), // No read record = unread
          gte(notifications.createdAt, customer.createdAt) // Only notifications after customer registration
        )
      );

    return unreadCount[0]?.count || 0;
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
    case "admin_notification":
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
