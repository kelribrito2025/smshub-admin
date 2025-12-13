import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import { getDb } from "./db";
import { users } from "../drizzle/schema";
import { eq } from "drizzle-orm";
import { settingsRouter } from "./routers/settings";
import { countriesRouter } from "./routers/countries";
import { servicesRouter } from "./routers/services";

import { syncRouter } from "./routers/sync";
import { statsRouter } from "./routers/stats";
import { pricesRouter } from './routers/prices';
import { customersRouter } from './routers/customers';
import { apiKeysRouter } from "./routers/apiKeys";
import { publicRouter } from "./routers/public";
import { financialRouter } from "./routers/financial";
import { storeRouter } from "./routers/store";
import { apisRouter } from "./routers/apis";
import { apiMetricsRouter } from "./routers/api-metrics";
import { pixRouter } from "./routers/pix";
import { stripeRouter } from "./routers/stripe";
import { paymentSettingsRouter } from "./routers/paymentSettings";
import { securityRouter } from "./routers/security";
import { auditRouter } from "./routers/audit";
import { affiliateRouter } from "./routers/affiliateRouter";
import { affiliateAdminRouter } from "./routers/affiliateAdminRouter";
import { exchangeRateRouter } from "./routers/exchange-rate";
import { adminMenusRouter } from "./routers/adminMenus";
import { rechargesRouter } from "./routers/recharges";
import { notificationsRouter } from "./routers/notifications";
import { emailTestRouter } from "./routers/email-test";
import { apiPerformanceRouter } from "./routers/apiPerformance";
import { impersonationRouter } from "./routers/impersonation";

export const appRouter = router({
    // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
    updateNavLayout: protectedProcedure
      .input(z.object({
        navLayout: z.enum(["sidebar", "top"]),
      }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        await db.update(users)
          .set({ navLayout: input.navLayout })
          .where(eq(users.id, ctx.user.id));
        return { success: true };
      }),
    getNavLayout: protectedProcedure
      .query(async ({ ctx }) => {
        const db = await getDb();
        if (!db) return "sidebar";
        const [user] = await db.select({ navLayout: users.navLayout })
          .from(users)
          .where(eq(users.id, ctx.user.id));
        return user?.navLayout || "sidebar";
      }),
  }),

  // Admin routers
  settings: settingsRouter,
  countries: countriesRouter,
  services: servicesRouter,

  prices: pricesRouter,
  customers: customersRouter,
  sync: syncRouter,
  stats: statsRouter,
  apiKeys: apiKeysRouter,
  financial: financialRouter,
  apis: apisRouter,
  apiMetrics: apiMetricsRouter,
  apiPerformance: apiPerformanceRouter,
  paymentSettings: paymentSettingsRouter,
  audit: auditRouter,
  affiliateAdmin: affiliateAdminRouter,
  exchangeRate: exchangeRateRouter,
  adminMenus: adminMenusRouter,

  // Public API (for sales dashboard)
  public: publicRouter,

  // Store API (for customer-facing sales panel)
  store: storeRouter,
  pix: pixRouter,
  stripe: stripeRouter,
  security: securityRouter,
  affiliate: affiliateRouter,
  recharges: rechargesRouter,
  notifications: notificationsRouter,
  emailTest: emailTestRouter,
  impersonation: impersonationRouter,
});

export type AppRouter = typeof appRouter;
