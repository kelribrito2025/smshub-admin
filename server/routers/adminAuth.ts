import { z } from "zod";
import { router, publicProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { users } from "../../drizzle/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { TRPCError } from "@trpc/server";
import { getSessionCookieOptions } from "../_core/cookies";

const JWT_SECRET = process.env.JWT_SECRET || "fallback-secret-change-in-production";

/**
 * Admin Authentication Router
 * Traditional email + password login for admin users
 */
export const adminAuthRouter = router({
  /**
   * Login with email and password
   */
  login: publicProcedure
    .input(
      z.object({
        email: z.string().email(),
        password: z.string().min(8),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { email, password } = input;

      // Find user by email
      const db = await getDb();
      if (!db) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });
      }

      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.email, email))
        .limit(1);

      if (!user) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Credenciais inválidas",
        });
      }

      // Check if user is admin
      if (user.role !== "admin") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Acesso negado",
        });
      }

      // Check if password is set
      if (!user.passwordHash) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Senha não configurada para este usuário",
        });
      }

      // Verify password
      const isValidPassword = await bcrypt.compare(password, user.passwordHash);
      if (!isValidPassword) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Credenciais inválidas",
        });
      }

      // Generate JWT token
      const token = jwt.sign(
        {
          userId: user.id,
          email: user.email,
          role: user.role,
        },
        JWT_SECRET,
        { expiresIn: "7d" }
      );

      // Set cookie
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.cookie("app_session", token, {
        ...cookieOptions,
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      });

      // Update last signed in
      await db
        .update(users)
        .set({ lastSignedIn: new Date() })
        .where(eq(users.id, user.id));

      return {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      };
    }),

  /**
   * Get current user from session
   */
  me: publicProcedure.query(async ({ ctx }) => {
    if (!ctx.user) {
      return null;
    }

    return {
      id: ctx.user.id,
      email: ctx.user.email,
      name: ctx.user.name,
      role: ctx.user.role,
    };
  }),

  /**
   * Logout
   */
  logout: publicProcedure.mutation(async ({ ctx }) => {
    ctx.res.clearCookie("app_session", {
      path: "/",
    });
    return { success: true };
  }),

  /**
   * Set password for admin user (utility procedure)
   */
  setPassword: publicProcedure
    .input(
      z.object({
        email: z.string().email(),
        password: z.string().min(8),
      })
    )
    .mutation(async ({ input }) => {
      const { email, password } = input;

      // Find user
      const db = await getDb();
      if (!db) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });
      }

      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.email, email))
        .limit(1);

      if (!user) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Usuário não encontrado",
        });
      }

      // Check if user is admin
      if (user.role !== "admin") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Apenas admins podem ter senha definida",
        });
      }

      // Hash password
      const passwordHash = await bcrypt.hash(password, 10);

      // Update user
      await db
        .update(users)
        .set({ passwordHash })
        .where(eq(users.id, user.id));

      return { success: true };
    }),
});
