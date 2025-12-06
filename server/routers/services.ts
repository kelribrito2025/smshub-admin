import { z } from 'zod';
import { router } from '../_core/trpc';
import { adminProcedure } from '../admin-middleware';
import {
  getAllServices,
  getServiceById,
  updateService,
  deleteService,
  upsertService,
} from '../db-helpers';
import { getDb } from '../db';
import { services, activations } from '../../drizzle/schema';
import { eq, sql } from 'drizzle-orm';

export const servicesRouter = router({
  /**
   * Create a new service manually
   */
  create: adminProcedure
    .input(
      z.object({
        smshubCode: z.string().min(1),
        name: z.string().min(1),
        category: z.string().optional(),
        active: z.boolean().default(true),
        markupPercentage: z.number().default(0),
        markupFixed: z.number().default(0),
      })
    )
    .mutation(async ({ input }) => {
      await upsertService({
        smshubCode: input.smshubCode,
        name: input.name,
        category: input.category || null,
        active: input.active,
        markupPercentage: input.markupPercentage,
        markupFixed: input.markupFixed,
      });

      return { success: true };
    }),
  /**
   * Get all services
   */
  getAll: adminProcedure
    .input(z.object({ activeOnly: z.boolean().optional() }).optional())
    .query(async ({ input }) => {
      return getAllServices(input?.activeOnly || false);
    }),

  /**
   * Get service by ID
   */
  getById: adminProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      return getServiceById(input.id);
    }),

  /**
   * Update service
   */
  update: adminProcedure
    .input(
      z.object({
        id: z.number(),
        name: z.string().optional(),
        category: z.string().optional(),
        active: z.boolean().optional(),
        markupPercentage: z.number().min(0).max(1000).optional(),
        markupFixed: z.number().min(0).optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      await updateService(id, data);
      return { success: true };
    }),

  /**
   * Toggle service active status
   */
  toggleActive: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const service = await getServiceById(input.id);
      if (!service) {
        throw new Error('Service not found');
      }

      await updateService(input.id, { active: !service.active });
      return { success: true, active: !service.active };
    }),

  /**
   * Bulk update markup for multiple services
   */
  bulkUpdateMarkup: adminProcedure
    .input(
      z.object({
        serviceIds: z.array(z.number()),
        markupPercentage: z.number().min(0).max(1000).optional(),
        markupFixed: z.number().min(0).optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { serviceIds, markupPercentage, markupFixed } = input;

      for (const id of serviceIds) {
        await updateService(id, {
          ...(markupPercentage !== undefined && { markupPercentage }),
          ...(markupFixed !== undefined && { markupFixed }),
        });
      }

      return { success: true, updated: serviceIds.length };
    }),

  /**
   * Bulk update category for multiple services
   */
  bulkUpdateCategory: adminProcedure
    .input(
      z.object({
        serviceIds: z.array(z.number()),
        category: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      const { serviceIds, category } = input;

      for (const id of serviceIds) {
        await updateService(id, { category });
      }

      return { success: true, updated: serviceIds.length };
    }),

  /**
   * Delete service
   */
  delete: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await deleteService(input.id);
      return { success: true };
    }),

  /**
   * Recalcular totalSales de todos os serviços baseado apenas em ativações concluídas
   */
  recalculateSales: adminProcedure
    .mutation(async () => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      // 1. Resetar todos os totalSales para 0
      await db.update(services).set({ totalSales: 0 });

      // 2. Contar ativações concluídas por serviço
      const salesByService = await db
        .select({
          serviceId: activations.serviceId,
          count: sql<number>`COUNT(*)`
        })
        .from(activations)
        .where(eq(activations.status, 'completed'))
        .groupBy(activations.serviceId);

      // 3. Atualizar totalSales de cada serviço
      let updated = 0;
      for (const { serviceId, count } of salesByService) {
        if (serviceId) {
          await db
            .update(services)
            .set({ totalSales: Number(count) })
            .where(eq(services.id, serviceId));
          updated++;
        }
      }

      const totalSales = salesByService.reduce((sum, s) => sum + Number(s.count), 0);

      return { 
        success: true, 
        servicesUpdated: updated,
        totalSales,
        message: `Recalculado com sucesso! ${updated} serviços atualizados com ${totalSales} vendas concluídas.`
      };
    }),
});
