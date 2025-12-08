import { z } from "zod";
import bcrypt from "bcrypt";
import { router, publicProcedure } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import { users } from "../../drizzle/schema";
import { eq, and } from "drizzle-orm";
import jwt from "jsonwebtoken";
import { ENV } from "../_core/env";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "../_core/cookies";

const SALT_ROUNDS = 10;

export const adminAuthRouter = router({
  /**
   * Admin login with email and password
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
          message: "Banco de dados não disponível",
        });
      }

      const [user] = await db
        .select()
        .from(users)
        .where(and(eq(users.email, email), eq(users.role, "admin")))
        .limit(1);

      if (!user) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Email ou senha inválidos",
        });
      }

      // Check if user has password hash
      if (!user.passwordHash) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Este usuário não possui senha configurada",
        });
      }

      // Verify password
      const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

      if (!isPasswordValid) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Email ou senha inválidos",
        });
      }

      // Update last signed in
      await db
        .update(users)
        .set({ lastSignedIn: new Date() })
        .where(eq(users.id, user.id));

      // Create JWT token
      const token = jwt.sign(
        {
          userId: user.id,
          openId: user.openId,
          role: user.role,
          email: user.email,
          name: user.name,
        },
        ENV.cookieSecret,
        { expiresIn: "7d" }
      );

      // Set cookie
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.cookie(COOKIE_NAME, token, {
        ...cookieOptions,
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      });

      return {
        success: true,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
      };
    }),

  /**
   * Get current admin user from JWT token
   */
  me: publicProcedure.query(({ ctx }) => {
    return ctx.user;
  }),

  /**
   * Admin logout
   */
  logout: publicProcedure.mutation(({ ctx }) => {
    const cookieOptions = getSessionCookieOptions(ctx.req);
    ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
    return {
      success: true,
    } as const;
  }),

  /**
   * Set password for admin user (utility endpoint)
   */
  setPassword: publicProcedure
    .input(
      z.object({
        userId: z.number(),
        password: z.string().min(8),
      })
    )
    .mutation(async ({ input }) => {
      const { userId, password } = input;

      // Hash password
      const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

      // Update user
      const db = await getDb();
      if (!db) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Banco de dados não disponível",
        });
      }

      await db
        .update(users)
        .set({ passwordHash })
        .where(eq(users.id, userId));

      return {
        success: true,
      };
    }),
});
