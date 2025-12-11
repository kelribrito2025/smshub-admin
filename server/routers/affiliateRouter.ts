import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { publicProcedure, router } from "../_core/trpc";
import {
  getAffiliateSettings,
  getReferralsByAffiliate,
  getReferralsCountByAffiliate,
  getEarningsByAffiliate,
  getAffiliateStats,
} from "../db-helpers/affiliate-helpers";
import { getCustomerById } from "../customers-helpers";

/**
 * Affiliate Router - Endpoints for the referral program (customer-facing)
 * Uses customerId from input instead of ctx.customer
 */
export const affiliateRouter = router({
  /**
   * Get referral link for a customer
   */
  getReferralLink: publicProcedure
    .input(z.object({ customerId: z.number() }))
    .query(async ({ input }) => {
      const customer = await getCustomerById(input.customerId);
      if (!customer) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Customer not found" });
      }

      // Check if program is active
      const settings = await getAffiliateSettings();
      if (!settings.isActive) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Referral program is currently disabled" });
      }

      // Generate referral link using PIN (not ID)
      const baseUrl = process.env.VITE_FRONTEND_URL || "https://smshubdash-2kemnlvg.manus.space";
      const referralLink = `${baseUrl}/?ref=${customer.pin}`;

      return {
        referralLink,
        customerId: customer.id,
        bonusPercentage: settings.bonusPercentage,
      };
    }),

  /**
   * Get all referrals for a customer with pagination
   */
  getMyReferrals: publicProcedure
    .input(
      z.object({
        customerId: z.number(),
        limit: z.number().optional().default(13),
        offset: z.number().optional().default(0),
      })
    )
    .query(async ({ input }) => {
      const customer = await getCustomerById(input.customerId);
      if (!customer) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Customer not found" });
      }

      const referrals = await getReferralsByAffiliate(customer.id, {
        limit: input.limit,
        offset: input.offset,
      });

      return referrals.map((ref) => ({
        id: ref.id,
        referredId: ref.referredId,
        referredName: ref.referredName || "N/A",
        referredEmail: ref.referredEmail || "N/A",
        status: ref.status,
        createdAt: ref.createdAt,
        firstRechargeAt: ref.firstRechargeAt,
        firstRechargeAmount: ref.firstRechargeAmount || 0,
        bonusGenerated: ref.bonusGenerated || 0,
      }));
    }),

  /**
   * Get earnings history for a customer
   */
  getMyEarnings: publicProcedure
    .input(z.object({ customerId: z.number() }))
    .query(async ({ input }) => {
      const customer = await getCustomerById(input.customerId);
      if (!customer) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Customer not found" });
      }

      const earnings = await getEarningsByAffiliate(customer.id);

      return earnings.map((earning) => ({
        id: earning.id,
        amount: earning.amount,
        description: earning.description || "",
        createdAt: earning.createdAt,
      }));
    }),

  /**
   * Get affiliate statistics for a customer
   */
  getStats: publicProcedure
    .input(z.object({ customerId: z.number() }))
    .query(async ({ input }) => {
      const customer = await getCustomerById(input.customerId);
      if (!customer) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Customer not found" });
      }

      const stats = await getAffiliateStats(customer.id);

      return {
        totalReferrals: stats.totalReferrals,
        activeReferrals: stats.activeReferrals,
        totalEarnings: stats.totalEarnings,
        conversionRate: stats.conversionRate,
        bonusBalance: customer.bonusBalance,
      };
    }),

  /**
   * Get total count of referrals for a customer
   */
  getReferralsCount: publicProcedure
    .input(z.object({ customerId: z.number() }))
    .query(async ({ input }) => {
      const customer = await getCustomerById(input.customerId);
      if (!customer) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Customer not found" });
      }

      const count = await getReferralsCountByAffiliate(customer.id);
      return count;
    }),

  /**
   * Get program rules and settings
   */
  getProgramInfo: publicProcedure.query(async () => {
    const settings = await getAffiliateSettings();

    return {
      isActive: settings.isActive,
      bonusPercentage: settings.bonusPercentage,
      rules: [
        `Após alguém se cadastrar pelo seu link e fizer a primeira recarga, você ganha ${settings.bonusPercentage}% do valor como bônus`,
        "O bônus é creditado automaticamente no seu saldo",
        "O saldo de bônus pode ser usado para comprar serviços dentro da plataforma",
        "O saldo de bônus não pode ser sacado, apenas utilizado para compras",
      ],
    };
  }),
});
