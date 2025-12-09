import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
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
});

export type AppRouter = typeof appRouter;
