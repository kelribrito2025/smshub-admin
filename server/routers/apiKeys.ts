import { z } from 'zod';
import { router } from '../_core/trpc';
import { adminProcedure } from '../admin-middleware';
import {
  createApiKey,
  getAllApiKeys,
  toggleApiKeyActive,
  deleteApiKey,
} from '../api-keys-helpers';

export const apiKeysRouter = router({
  /**
   * Get all API keys
   */
  getAll: adminProcedure.query(async () => {
    return getAllApiKeys();
  }),

  /**
   * Create new API key
   */
  create: adminProcedure
    .input(
      z.object({
        name: z.string().min(1),
        expiresAt: z.date().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const key = await createApiKey({
        name: input.name,
        active: 1,
        expiresAt: input.expiresAt || null,
      });

      return { success: true, key };
    }),

  /**
   * Toggle API key active status
   */
  toggleActive: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const active = await toggleApiKeyActive(input.id);
      return { success: true, active };
    }),

  /**
   * Delete API key
   */
  delete: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await deleteApiKey(input.id);
      return { success: true };
    }),
});
