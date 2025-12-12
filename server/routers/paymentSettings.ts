import { z } from "zod";
import { publicProcedure, router } from "../_core/trpc";
import { adminProcedure } from "../admin-middleware";
import { getPaymentSettings, updatePaymentSettings } from "../db";

export const paymentSettingsRouter = router({
  // Get current payment settings (public - needed for store)
  get: publicProcedure.query(async () => {
    const settings = await getPaymentSettings();
    
    // Return default if no settings exist
    if (!settings) {
      return {
        pixEnabled: true,
        pixMinAmount: 1000,
        pixBonusPercentage: 5,
        stripeEnabled: true,
        stripeMinAmount: 2000,
        stripeBonusPercentage: 0,
      };
    }
    
    return {
      pixEnabled: settings.pixEnabled,
      pixMinAmount: settings.pixMinAmount,
      pixBonusPercentage: settings.pixBonusPercentage,
      stripeEnabled: settings.stripeEnabled,
      stripeMinAmount: settings.stripeMinAmount,
      stripeBonusPercentage: settings.stripeBonusPercentage,
    };
  }),

  // Update payment settings (admin only)
  update: adminProcedure
    .input(z.object({
      pixEnabled: z.boolean().optional(),
      pixMinAmount: z.number().int().min(0).optional(),
      pixBonusPercentage: z.number().int().min(0).max(100).optional(),
      stripeEnabled: z.boolean().optional(),
      stripeMinAmount: z.number().int().min(0).optional(),
      stripeBonusPercentage: z.number().int().min(0).max(100).optional(),
    }))
    .mutation(async ({ input }) => {
      const updated = await updatePaymentSettings(input);
      
      if (!updated) {
        throw new Error("Failed to update payment settings");
      }
      
      return {
        pixEnabled: updated.pixEnabled,
        pixMinAmount: updated.pixMinAmount,
        pixBonusPercentage: updated.pixBonusPercentage,
        stripeEnabled: updated.stripeEnabled,
        stripeMinAmount: updated.stripeMinAmount,
        stripeBonusPercentage: updated.stripeBonusPercentage,
      };
    }),
});
