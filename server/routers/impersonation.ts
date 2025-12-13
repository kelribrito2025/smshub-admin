import { z } from "zod";
import { router, protectedProcedure, publicProcedure } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import jwt from "jsonwebtoken";
import * as schema from "../../drizzle/schema";
import { impersonationLogs, customers, users } from "../../drizzle/schema";
import { getDb } from "../db";
import { eq, and } from "drizzle-orm";
import { ENV } from "../_core/env";
import { getSessionCookieOptions } from "../_core/cookies";

const IMPERSONATION_TOKEN_EXPIRY = 10 * 60; // 10 minutes in seconds
const SUPPORT_COOKIE_NAME = "support_session";

/**
 * Admin procedure that checks for support:impersonate permission
 */
const adminImpersonateProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Acesso negado: apenas administradores podem usar esta funcionalidade",
    });
  }

  // Parse permissions from JSON string
  let permissions: string[] = [];
  if (ctx.user.permissions) {
    try {
      permissions = JSON.parse(ctx.user.permissions);
    } catch (e) {
      permissions = [];
    }
  }

  // Check if user has support:impersonate permission
  if (!permissions.includes("support:impersonate")) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Você não tem permissão para fazer impersonation de clientes",
    });
  }

  return next({ ctx });
});

export const impersonationRouter = router({
  /**
   * Generate impersonation token for admin to login as customer
   */
  generateToken: adminImpersonateProcedure
    .input(
      z.object({
        customerId: z.number().int().positive(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { customerId } = input;

      // Verify customer exists
      const db = await getDb();
      if (!db) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Banco de dados indisponível",
        });
      }

      const customerResult = await db.select().from(customers).where(eq(customers.id, customerId)).limit(1);
      const customer = customerResult[0] || null;

      if (!customer) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Cliente não encontrado",
        });
      }

      // Generate JWT token
      const expiresAt = new Date(Date.now() + IMPERSONATION_TOKEN_EXPIRY * 1000);
      const token = jwt.sign(
        {
          type: "impersonation",
          adminId: ctx.user.id,
          customerId,
          exp: Math.floor(expiresAt.getTime() / 1000),
        },
        ENV.cookieSecret
      );

      // Get IP and User Agent
      const ipAddress = ctx.req.ip || ctx.req.headers["x-forwarded-for"] || "unknown";
      const userAgent = ctx.req.headers["user-agent"] || "unknown";

      // Log impersonation start
      await db.insert(impersonationLogs).values({
        adminId: ctx.user.id,
        customerId,
        token,
        status: "active",
        ipAddress: typeof ipAddress === "string" ? ipAddress : ipAddress[0],
        userAgent,
        expiresAt,
      });

      return {
        token,
        customerId,
        customerName: customer.name,
        customerEmail: customer.email,
        expiresAt: expiresAt.toISOString(),
      };
    }),

  /**
   * Validate impersonation token and create support session
   */
  validateToken: publicProcedure
    .input(
      z.object({
        token: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { token } = input;

      try {
        // Verify JWT token
        const decoded = jwt.verify(token, ENV.cookieSecret) as {
          type: string;
          adminId: number;
          customerId: number;
          exp: number;
        };

        if (decoded.type !== "impersonation") {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Token inválido",
          });
        }

        // Check if token exists and is active in database
        const db = await getDb();
        if (!db) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Banco de dados indisponível",
          });
        }

        const logResult = await db.select().from(impersonationLogs).where(
          and(
            eq(impersonationLogs.token, token),
            eq(impersonationLogs.status, "active")
          )
        ).limit(1);
        const log = logResult[0] || null;

        if (!log) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Token inválido ou já utilizado",
          });
        }

        // Check if token is expired
        if (new Date() > new Date(log.expiresAt)) {
          // Mark as expired
          await db
            .update(impersonationLogs)
            .set({ status: "expired" })
            .where(eq(impersonationLogs.id, log.id));

          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Token expirado",
          });
        }

        // Get customer data
        const customerResult = await db.select().from(customers).where(eq(customers.id, decoded.customerId)).limit(1);
        const customer = customerResult[0] || null;

        if (!customer) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Cliente não encontrado",
          });
        }

        // Get admin data for banner
        const admin = await db.select().from(users).where(eq(users.id, decoded.adminId)).limit(1).then(rows => rows[0]);

        // Create support session cookie (separate from normal session)
        const supportSessionData = {
          type: "impersonation",
          customerId: customer.id,
          customerEmail: customer.email,
          adminId: decoded.adminId,
          adminName: admin?.name || "Admin",
          logId: log.id,
          expiresAt: log.expiresAt,
        };

        const supportToken = jwt.sign(supportSessionData, ENV.cookieSecret, {
          expiresIn: IMPERSONATION_TOKEN_EXPIRY,
        });

        // Set support session cookie
        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(SUPPORT_COOKIE_NAME, supportToken, {
          ...cookieOptions,
          maxAge: IMPERSONATION_TOKEN_EXPIRY * 1000,
        });

        return {
          success: true,
          customer: {
            id: customer.id,
            name: customer.name,
            email: customer.email,
            pin: customer.pin,
            balance: customer.balance,
            active: customer.active,
            banned: customer.banned,
            bannedAt: customer.bannedAt,
            bannedReason: customer.bannedReason,
          },
          admin: {
            id: decoded.adminId,
            name: admin?.name || "Admin",
          },
        };
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }

        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Token inválido ou expirado",
        });
      }
    }),

  /**
   * End impersonation session
   */
  endSession: publicProcedure.mutation(async ({ ctx }) => {
    // Get support session cookie
    const supportToken = ctx.req.cookies?.[SUPPORT_COOKIE_NAME];

    if (!supportToken) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Nenhuma sessão de suporte ativa",
      });
    }

    try {
      // Decode token to get log ID
      const decoded = jwt.verify(supportToken, ENV.cookieSecret) as {
        type: string;
        logId: number;
      };

      if (decoded.type !== "impersonation") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Sessão inválida",
        });
      }

      // Mark impersonation as ended
      const db = await getDb();
      if (!db) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Banco de dados indisponível",
        });
      }

      await db
        .update(impersonationLogs)
        .set({
          status: "ended",
          endedAt: new Date(),
        })
        .where(eq(impersonationLogs.id, decoded.logId));

      // Clear support session cookie
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(SUPPORT_COOKIE_NAME, {
        ...cookieOptions,
        maxAge: -1,
      });

      return {
        success: true,
      };
    } catch (error) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Erro ao encerrar sessão de suporte",
      });
    }
  }),

  /**
   * Get current impersonation session info
   */
  getCurrentSession: publicProcedure.query(async ({ ctx }) => {
    const supportToken = ctx.req.cookies?.[SUPPORT_COOKIE_NAME];

    if (!supportToken) {
      return null;
    }

    try {
      const decoded = jwt.verify(supportToken, ENV.cookieSecret) as {
        type: string;
        customerId: number;
        customerEmail: string;
        adminId: number;
        adminName: string;
        logId: number;
        expiresAt: Date;
      };

      if (decoded.type !== "impersonation") {
        return null;
      }

      // Get customer name from database
      const db = await getDb();
      let customerName = decoded.customerEmail;
      
      if (db) {
        const customerResult = await db.select().from(customers).where(eq(customers.id, decoded.customerId)).limit(1);
        const customer = customerResult[0] || null;
        if (customer) {
          customerName = customer.name || customer.email;
        }
      }

      return {
        isImpersonating: true,
        customer: {
          id: decoded.customerId,
          email: decoded.customerEmail,
          name: customerName,
        },
        admin: {
          id: decoded.adminId,
          name: decoded.adminName,
        },
        expiresAt: decoded.expiresAt,
      };
    } catch (error) {
      return null;
    }
  }),
});
