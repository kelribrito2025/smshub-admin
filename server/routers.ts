import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";

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

  clients: router({
    list: protectedProcedure.query(async () => {
      const { getAllClients } = await import('./db');
      return await getAllClients();
    }),
    getById: protectedProcedure.input(z.object({ id: z.number() })).query(async ({ input }) => {
      const { getClientById } = await import('./db');
      return await getClientById(input.id);
    }),
    create: protectedProcedure.input(z.object({
      name: z.string(),
      email: z.string().email().optional(),
      phone: z.string().optional(),
      company: z.string().optional(),
    })).mutation(async ({ input }) => {
      const { createClient } = await import('./db');
      return await createClient(input);
    }),
    update: protectedProcedure.input(z.object({
      id: z.number(),
      name: z.string().optional(),
      email: z.string().email().optional(),
      phone: z.string().optional(),
      company: z.string().optional(),
      status: z.enum(['active', 'inactive']).optional(),
    })).mutation(async ({ input }) => {
      const { updateClient } = await import('./db');
      const { id, ...data } = input;
      return await updateClient(id, data);
    }),
  }),

  campaigns: router({
    list: protectedProcedure.query(async () => {
      const { getAllCampaigns } = await import('./db');
      return await getAllCampaigns();
    }),
    getById: protectedProcedure.input(z.object({ id: z.number() })).query(async ({ input }) => {
      const { getCampaignById } = await import('./db');
      return await getCampaignById(input.id);
    }),
    getByClient: protectedProcedure.input(z.object({ clientId: z.number() })).query(async ({ input }) => {
      const { getCampaignsByClient } = await import('./db');
      return await getCampaignsByClient(input.clientId);
    }),
    create: protectedProcedure.input(z.object({
      clientId: z.number(),
      name: z.string(),
      message: z.string(),
      scheduledAt: z.date().optional(),
      totalRecipients: z.number().default(0),
    })).mutation(async ({ input, ctx }) => {
      const { createCampaign } = await import('./db');
      return await createCampaign({
        ...input,
        createdBy: ctx.user.id,
      });
    }),
    update: protectedProcedure.input(z.object({
      id: z.number(),
      name: z.string().optional(),
      message: z.string().optional(),
      status: z.enum(['draft', 'scheduled', 'sending', 'completed', 'failed']).optional(),
      scheduledAt: z.date().optional(),
      totalRecipients: z.number().optional(),
      successCount: z.number().optional(),
      failedCount: z.number().optional(),
    })).mutation(async ({ input }) => {
      const { updateCampaign } = await import('./db');
      const { id, ...data } = input;
      return await updateCampaign(id, data);
    }),
  }),

  messages: router({
    getByCampaign: protectedProcedure.input(z.object({ campaignId: z.number() })).query(async ({ input }) => {
      const { getMessagesByCampaign } = await import('./db');
      return await getMessagesByCampaign(input.campaignId);
    }),
    create: protectedProcedure.input(z.object({
      campaignId: z.number(),
      recipient: z.string(),
      message: z.string(),
    })).mutation(async ({ input }) => {
      const { createMessage } = await import('./db');
      return await createMessage(input);
    }),
  }),

  sales: router({
    list: protectedProcedure.query(async () => {
      const { getAllSales } = await import('./db');
      return await getAllSales();
    }),
    getByClient: protectedProcedure.input(z.object({ clientId: z.number() })).query(async ({ input }) => {
      const { getSalesByClient } = await import('./db');
      return await getSalesByClient(input.clientId);
    }),
    getBySeller: protectedProcedure.input(z.object({ sellerId: z.number() })).query(async ({ input }) => {
      const { getSalesBySeller } = await import('./db');
      return await getSalesBySeller(input.sellerId);
    }),
    create: protectedProcedure.input(z.object({
      clientId: z.number(),
      amount: z.number(),
      smsCredits: z.number(),
      paymentMethod: z.string().optional(),
      notes: z.string().optional(),
    })).mutation(async ({ input, ctx }) => {
      const { createSale } = await import('./db');
      return await createSale({
        ...input,
        sellerId: ctx.user.id,
      });
    }),
    update: protectedProcedure.input(z.object({
      id: z.number(),
      status: z.enum(['pending', 'completed', 'cancelled']).optional(),
      notes: z.string().optional(),
    })).mutation(async ({ input }) => {
      const { updateSale } = await import('./db');
      const { id, ...data } = input;
      return await updateSale(id, data);
    }),
  }),
});

export type AppRouter = typeof appRouter;
