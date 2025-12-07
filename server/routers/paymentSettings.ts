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
        stripeEnabled: true,
      };
    }
    
    return {
      pixEnabled: settings.pixEnabled,
      stripeEnabled: settings.stripeEnabled,
    };
  }),

  // Update payment settings (admin only)
  update: adminProcedure
    .input(z.object({
      pixEnabled: z.boolean(),
      stripeEnabled: z.boolean(),
    }))
    .mutation(async ({ input }) => {
      const updated = await updatePaymentSettings(input.pixEnabled, input.stripeEnabled);
      
      if (!updated) {
        throw new Error("Failed to update payment settings");
      }
      
      return {
        pixEnabled: updated.pixEnabled,
        stripeEnabled: updated.stripeEnabled,
      };
    }),
});
