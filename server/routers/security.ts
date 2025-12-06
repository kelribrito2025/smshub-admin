import { z } from "zod";
import { router, publicProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { customerSessions } from "../../drizzle/schema";
import { desc, and, eq } from "drizzle-orm";

export const securityRouter = router({
  /**
   * Get last 5 sessions for a customer
   */
  getSessions: publicProcedure
    .input(
      z.object({
        customerId: z.number(),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];

      const sessions = await db
        .select()
        .from(customerSessions)
        .where(eq(customerSessions.customerId, input.customerId))
        .orderBy(desc(customerSessions.loginAt))
        .limit(5);

      return sessions;
    }),

  /**
   * Terminate a specific session
   */
  terminateSession: publicProcedure
    .input(
      z.object({
        sessionId: z.number(),
        customerId: z.number(), // For security: ensure customer can only terminate their own sessions
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) return { success: false };

      // Update session to inactive
      await db
        .update(customerSessions)
        .set({
          isActive: false,
          terminatedAt: new Date(),
        })
        .where(
          and(
            eq(customerSessions.id, input.sessionId),
            eq(customerSessions.customerId, input.customerId)
          )
        );

      return { success: true };
    }),
});
