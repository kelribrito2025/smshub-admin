import { z } from "zod";
import { router } from "../_core/trpc";
import { adminProcedure } from "../admin-middleware";
import {
  getAffiliateSettings,
  updateAffiliateSettings,
  getAllAffiliatesWithStats,
  getAllReferralsWithDetails,
} from "../db-helpers/affiliate-helpers";

/**
 * Affiliate Admin Router - Endpoints for managing the referral program (admin-only)
 */
export const affiliateAdminRouter = router({
  /**
   * Get current affiliate program settings
   */
  getSettings: adminProcedure.query(async () => {
    const settings = await getAffiliateSettings();
    return settings;
  }),

  /**
   * Update affiliate program settings
   */
  updateSettings: adminProcedure
    .input(
      z.object({
        bonusPercentage: z.number().min(0).max(100).optional(),
        description: z.string().optional(),
        isActive: z.boolean().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const updated = await updateAffiliateSettings(input);
      return updated;
    }),

  /**
   * Get all affiliates with their statistics
   */
  getAllAffiliates: adminProcedure.query(async () => {
    const affiliates = await getAllAffiliatesWithStats();
    return affiliates;
  }),

  /**
   * Get all referrals with full details
   */
  getAllReferrals: adminProcedure.query(async () => {
    const referrals = await getAllReferralsWithDetails();
    return referrals;
  }),
});
