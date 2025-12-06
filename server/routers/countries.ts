import { z } from 'zod';
import { router } from '../_core/trpc';
import { adminProcedure } from '../admin-middleware';
import {
  getAllCountries,
  getCountryById,
  updateCountry,
  deleteCountry,
  upsertCountry,
} from '../db-helpers';

export const countriesRouter = router({
  /**
   * Create a new country manually
   */
  create: adminProcedure
    .input(
      z.object({
        smshubId: z.number(),
        name: z.string().min(1),
        code: z.string().min(1),
        active: z.boolean().default(true),
        markupPercentage: z.number().default(0),
        markupFixed: z.number().default(0),
      })
    )
    .mutation(async ({ input }) => {
      await upsertCountry({
        smshubId: input.smshubId,
        name: input.name,
        code: input.code,
        active: input.active,
        markupPercentage: input.markupPercentage,
        markupFixed: input.markupFixed,
      });

      return { success: true };
    }),
  /**
   * Get all countries
   */
  getAll: adminProcedure
    .input(z.object({ activeOnly: z.boolean().optional() }).optional())
    .query(async ({ input }) => {
      return getAllCountries(input?.activeOnly || false);
    }),

  /**
   * Get country by ID
   */
  getById: adminProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      return getCountryById(input.id);
    }),

  /**
   * Update country
   */
  update: adminProcedure
    .input(
      z.object({
        id: z.number(),
        name: z.string().optional(),
        code: z.string().optional(),
        active: z.boolean().optional(),
        markupPercentage: z.number().min(0).max(1000).optional(),
        markupFixed: z.number().min(0).optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      await updateCountry(id, data);
      return { success: true };
    }),

  /**
   * Toggle country active status
   */
  toggleActive: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const country = await getCountryById(input.id);
      if (!country) {
        throw new Error('Country not found');
      }

      await updateCountry(input.id, { active: !country.active });
      return { success: true, active: !country.active };
    }),

  /**
   * Bulk update markup for multiple countries
   */
  bulkUpdateMarkup: adminProcedure
    .input(
      z.object({
        countryIds: z.array(z.number()),
        markupPercentage: z.number().min(0).max(1000).optional(),
        markupFixed: z.number().min(0).optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { countryIds, markupPercentage, markupFixed } = input;

      for (const id of countryIds) {
        await updateCountry(id, {
          ...(markupPercentage !== undefined && { markupPercentage }),
          ...(markupFixed !== undefined && { markupFixed }),
        });
      }

      return { success: true, updated: countryIds.length };
    }),

  /**
   * Delete country
   */
  delete: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await deleteCountry(input.id);
      return { success: true };
    }),
});
