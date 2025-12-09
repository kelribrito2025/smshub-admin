import { z } from "zod";
import { router, publicProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { customerSessions, passwordResetTokens, customers } from "../../drizzle/schema";
import { desc, and, eq } from "drizzle-orm";
import { randomBytes } from "crypto";
import bcrypt from "bcrypt";
import { sendPasswordResetEmail } from "../mailchimp-email";

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

  /**
   * Request password reset - generates token and sends email
   */
  requestPasswordReset: publicProcedure
    .input(
      z.object({
        email: z.string().email(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Find customer by email
      const customerResult = await db
        .select()
        .from(customers)
        .where(eq(customers.email, input.email))
        .limit(1);

      const customer = customerResult[0];

      // Always return success even if email not found (security best practice)
      if (!customer) {
        return { success: true, message: "Se o email existir, você receberá instruções de recuperação." };
      }

      // Generate secure random token
      const token = randomBytes(32).toString("hex");
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      // Save token to database
      await db.insert(passwordResetTokens).values({
        customerId: customer.id,
        token,
        expiresAt,
      });

      // Send email with reset link (async, don't block response)
      sendPasswordResetEmail(customer.email, customer.name, token).catch((error) => {
        console.error("[Security] Failed to send password reset email:", error);
      });

      return { success: true, message: "Se o email existir, você receberá instruções de recuperação." };
    }),

  /**
   * Reset password using token
   */
  resetPassword: publicProcedure
    .input(
      z.object({
        token: z.string(),
        newPassword: z.string().min(8),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Find valid token
      const tokenResult = await db
        .select()
        .from(passwordResetTokens)
        .where(
          and(
            eq(passwordResetTokens.token, input.token),
            eq(passwordResetTokens.used, false)
          )
        )
        .limit(1);

      const resetToken = tokenResult[0];

      if (!resetToken) {
        throw new Error("Token inválido ou já utilizado");
      }

      // Check if token expired
      if (new Date() > resetToken.expiresAt) {
        throw new Error("Token expirado. Solicite um novo link de recuperação.");
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(input.newPassword, 10);

      // Update customer password
      await db
        .update(customers)
        .set({ password: hashedPassword })
        .where(eq(customers.id, resetToken.customerId));

      // Mark token as used
      await db
        .update(passwordResetTokens)
        .set({ used: true, usedAt: new Date() })
        .where(eq(passwordResetTokens.id, resetToken.id));

      return { success: true, message: "Senha redefinida com sucesso!" };
    }),
});
