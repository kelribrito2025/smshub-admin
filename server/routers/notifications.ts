import { router, publicProcedure, protectedProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { notifications, notificationReads } from "../../drizzle/schema";
import { eq, desc, and, or, isNull, sql } from "drizzle-orm";
import { z } from "zod";

/**
 * Notifications Router
 * Handles notification history and management
 */

export const notificationsRouter = router({
  /**
   * Get all notifications for the current customer (ADMIN ONLY)
   * For store customers, use getForCustomer instead
   */
  getAll: publicProcedure.query(async ({ ctx }) => {
    if (!ctx.user) {
      return [];
    }

    const db = await getDb();
    if (!db) {
      return [];
    }
    
    // Get both user-specific and global notifications
    // LEFT JOIN with notification_reads to determine if user has read each notification
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
          eq(notificationReads.userId, ctx.user.id),
          eq(notificationReads.userType, "admin")
        )
      )
      .where(
        or(
          eq(notifications.customerId, ctx.user.id),
          isNull(notifications.customerId) // Global notifications
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
      
      // Insert a record in notification_reads (or ignore if already exists)
      await db
        .insert(notificationReads)
        .values({
          notificationId: input.id,
          userId: ctx.user.id,
          userType: "admin",
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
    
    const userId = ctx.user.id; // Store userId to avoid null check issues
    
    // Get all notifications visible to this user (user-specific + global)
    const visibleNotifications = await db
      .select({ id: notifications.id })
      .from(notifications)
      .where(
        or(
          eq(notifications.customerId, userId),
          isNull(notifications.customerId) // Global notifications
        )
      );

    // Insert read records for all visible notifications
    if (visibleNotifications.length > 0) {
      const readRecords = visibleNotifications.map((notif) => ({
        notificationId: notif.id,
        userId: userId,
        userType: "admin" as const,
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
   * Send admin notification (global or individual)
   * Admin-only endpoint
   */
  sendAdminNotification: protectedProcedure
    .input(
      z.object({
        title: z.string().min(1, "Título é obrigatório"),
        message: z.string().min(1, "Descrição é obrigatória"),
        type: z.enum(["global", "individual"]),
        pinOrEmail: z.string().optional(), // Required if type is "individual"
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

      let targetCustomerId: number | null = null;

      // If individual notification, find customer by PIN or email
      if (input.type === "individual") {
        if (!input.pinOrEmail) {
          throw new Error("PIN ou e-mail é obrigatório para notificações individuais");
        }

        console.log(`[Notifications] 🔍 Buscando cliente: ${input.pinOrEmail}`);

        // Import customers table
        const { customers } = await import("../../drizzle/schema");

        // Try to parse as PIN (integer)
        const pinNumber = parseInt(input.pinOrEmail, 10);

        if (!isNaN(pinNumber)) {
          // Search by PIN
          console.log(`[Notifications] 🔍 Buscando por PIN: ${pinNumber}`);
          const pinResult = await db
            .select({ id: customers.id, email: customers.email, pin: customers.pin })
            .from(customers)
            .where(eq(customers.pin, pinNumber))
            .limit(1);

          if (pinResult.length > 0) {
            targetCustomerId = pinResult[0].id;
            console.log(`[Notifications] ✅ Cliente encontrado por PIN: ID=${targetCustomerId}, Email=${pinResult[0].email}, PIN=${pinResult[0].pin}`);
          } else {
            console.log(`[Notifications] ❌ Cliente NÃO encontrado com PIN: ${pinNumber}`);
            throw new Error(`Cliente não encontrado com PIN: ${input.pinOrEmail}`);
          }
        } else {
          // Search by email
          console.log(`[Notifications] 🔍 Buscando por email: ${input.pinOrEmail}`);
          const emailResult = await db
            .select({ id: customers.id, email: customers.email, pin: customers.pin })
            .from(customers)
            .where(eq(customers.email, input.pinOrEmail))
            .limit(1);

          if (emailResult.length > 0) {
            targetCustomerId = emailResult[0].id;
            console.log(`[Notifications] ✅ Cliente encontrado por email: ID=${targetCustomerId}, Email=${emailResult[0].email}, PIN=${emailResult[0].pin}`);
          } else {
            console.log(`[Notifications] ❌ Cliente NÃO encontrado com email: ${input.pinOrEmail}`);
            throw new Error(`Cliente não encontrado com e-mail: ${input.pinOrEmail}`);
          }
        }
      }

      // Create notification in database
      console.log(`[Notifications] 💾 Salvando notificação no banco: customerId=${targetCustomerId}, type=${input.type}`);
      await db.insert(notifications).values({
        customerId: targetCustomerId, // NULL for global, specific ID for individual
        type: "admin_notification",
        title: input.title,
        message: input.message,
      });
      console.log(`[Notifications] ✅ Notificação salva no banco com sucesso`);

      // Send real-time notification via SSE
      const { notificationsManager } = await import("../notifications-manager");
      
      const sseNotification = {
        type: "admin_notification" as const,
        title: input.title,
        message: input.message,
      };

      if (input.type === "global") {
        // Send to all connected clients
        console.log(`[Notifications] 📡 Enviando notificação GLOBAL via SSE para todos os clientes conectados`);
        const stats = notificationsManager.getStats();
        console.log(`[Notifications] 📊 Clientes conectados: ${stats.totalConnections} (${stats.totalCustomers} usuários únicos)`);
        notificationsManager.sendToAll(sseNotification);
        console.log(`[Notifications] ✅ Notificação GLOBAL enviada via SSE`);
      } else if (targetCustomerId) {
        // Send to specific customer
        console.log(`[Notifications] 📡 Enviando notificação INDIVIDUAL via SSE para customerId=${targetCustomerId}`);
        const stats = notificationsManager.getStats();
        const customerConnections = stats.customers.find(c => c.customerId === targetCustomerId);
        if (customerConnections) {
          console.log(`[Notifications] ✅ Cliente ${targetCustomerId} está CONECTADO (${customerConnections.connections} conexões ativas)`);
        } else {
          console.log(`[Notifications] ⚠️ Cliente ${targetCustomerId} NÃO está conectado via SSE (notificação salva no banco, mas não enviada em tempo real)`);
        }
        notificationsManager.sendToCustomer(targetCustomerId, sseNotification);
        console.log(`[Notifications] ✅ Notificação INDIVIDUAL enviada via SSE para customerId=${targetCustomerId}`);
      }

      return {
        success: true,
        message:
          input.type === "global"
            ? "Notificação global enviada com sucesso"
            : `Notificação enviada para o cliente ${input.pinOrEmail}`,
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
    
    // Count notifications visible to this user that don't have a read record
    const unreadCount = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(notifications)
      .leftJoin(
        notificationReads,
        and(
          eq(notificationReads.notificationId, notifications.id),
          eq(notificationReads.userId, ctx.user.id),
          eq(notificationReads.userType, "admin")
        )
      )
      .where(
        and(
          or(
            eq(notifications.customerId, ctx.user.id),
            isNull(notifications.customerId) // Global notifications
          ),
          isNull(notificationReads.id) // No read record = unread
        )
      );

    return unreadCount[0]?.count || 0;
  }),

  /**
   * Get all notifications for a store customer (by customerId)
   */
  getForCustomer: publicProcedure
    .input(z.object({ customerId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) {
        return [];
      }
      
      // Get both customer-specific and global notifications
      // LEFT JOIN with notification_reads to determine if customer has read each notification
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
            eq(notificationReads.userId, input.customerId),
            eq(notificationReads.userType, "customer")
          )
        )
        .where(
          or(
            eq(notifications.customerId, input.customerId),
            isNull(notifications.customerId) // Global notifications
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
   * Mark notification as read for store customer
   */
  markAsReadForCustomer: publicProcedure
    .input(z.object({ id: z.number(), customerId: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) {
        throw new Error("Database not available");
      }
      
      // Insert a record in notification_reads (or ignore if already exists)
      await db
        .insert(notificationReads)
        .values({
          notificationId: input.id,
          userId: input.customerId,
          userType: "customer",
        })
        .onDuplicateKeyUpdate({
          set: { readAt: sql`CURRENT_TIMESTAMP` },
        });

      return { success: true };
    }),

  /**
   * Mark all notifications as read for store customer
   */
  markAllAsReadForCustomer: publicProcedure
    .input(z.object({ customerId: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) {
        throw new Error("Database not available");
      }
      
      // Get all notifications visible to this customer (customer-specific + global)
      const visibleNotifications = await db
        .select({ id: notifications.id })
        .from(notifications)
        .where(
          or(
            eq(notifications.customerId, input.customerId),
            isNull(notifications.customerId) // Global notifications
          )
        );

      // Insert read records for all visible notifications
      if (visibleNotifications.length > 0) {
        const readRecords = visibleNotifications.map((notif) => ({
          notificationId: notif.id,
          userId: input.customerId,
          userType: "customer" as const,
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
