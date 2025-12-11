import { getDb } from "../db";
import {
  affiliateSettings,
  referrals,
  referralEarnings,
  customers,
  balanceTransactions,
} from "../../drizzle/schema";
import { eq, and, desc, sql, count } from "drizzle-orm";

/**
 * Get or create affiliate settings (singleton pattern)
 */
export async function getAffiliateSettings() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const settings = await db.select().from(affiliateSettings).limit(1);
  
  if (settings.length === 0) {
    // Create default settings
    const [newSettings] = await db.insert(affiliateSettings).values({
      bonusPercentage: 10,
      isActive: true,
    });
    return {
      id: newSettings.insertId,
      bonusPercentage: 10,
      isActive: true,
      updatedAt: new Date(),
    };
  }
  
  return settings[0];
}

/**
 * Update affiliate settings
 */
export async function updateAffiliateSettings(data: {
  bonusPercentage?: number;
  isActive?: boolean;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const settings = await getAffiliateSettings();
  
  await db
    .update(affiliateSettings)
    .set(data)
    .where(eq(affiliateSettings.id, settings.id));
  
  return getAffiliateSettings();
}

/**
 * Create a referral relationship
 */
export async function createReferral(referrerId: number, referredId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  // Check if referred customer already has a referrer
  const existing = await db
    .select()
    .from(referrals)
    .where(eq(referrals.referredId, referredId))
    .limit(1);
  
  if (existing.length > 0) {
    throw new Error("Customer already has a referrer");
  }
  
  const [result] = await db.insert(referrals).values({
    referrerId,
    referredId,
    status: "pending",
  });
  
  return result.insertId;
}

/**
 * Get referral by referred customer ID
 */
export async function getReferralByReferredId(referredId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db
    .select()
    .from(referrals)
    .where(eq(referrals.referredId, referredId))
    .limit(1);
  
  return result[0] || null;
}

/**
 * Get all referrals for an affiliate (referrer)
 */
export async function getReferralsByAffiliate(
  affiliateId: number,
  options?: { limit?: number; offset?: number }
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  let query = db
    .select({
      id: referrals.id,
      referredId: referrals.referredId,
      referredName: customers.name,
      referredEmail: customers.email,
      firstRechargeAt: referrals.firstRechargeAt,
      firstRechargeAmount: referrals.firstRechargeAmount,
      bonusGenerated: referrals.bonusGenerated,
      status: referrals.status,
      createdAt: referrals.createdAt,
    })
    .from(referrals)
    .leftJoin(customers, eq(referrals.referredId, customers.id))
    .where(eq(referrals.referrerId, affiliateId))
    .orderBy(desc(referrals.createdAt));
  
  // Apply pagination if provided
  if (options?.limit !== undefined) {
    query = query.limit(options.limit) as any;
  }
  if (options?.offset !== undefined) {
    query = query.offset(options.offset) as any;
  }
  
  const result = await query;
  return result;
}

/**
 * Get total count of referrals for an affiliate
 */
export async function getReferralsCountByAffiliate(affiliateId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db
    .select({ count: sql<number>`count(*)` })
    .from(referrals)
    .where(eq(referrals.referrerId, affiliateId));
  
  return Number(result[0]?.count) || 0;
}

/**
 * Get earnings history for an affiliate
 */
export async function getEarningsByAffiliate(affiliateId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db
    .select()
    .from(referralEarnings)
    .where(eq(referralEarnings.affiliateId, affiliateId))
    .orderBy(desc(referralEarnings.createdAt));
  
  return result;
}

/**
 * Get affiliate statistics
 */
export async function getAffiliateStats(affiliateId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  // Total referrals
  const totalReferrals = await db
    .select({ count: count() })
    .from(referrals)
    .where(eq(referrals.referrerId, affiliateId));
  
  // Total earnings
  const totalEarnings = await db
    .select({ sum: sql<number>`COALESCE(SUM(${referralEarnings.amount}), 0)` })
    .from(referralEarnings)
    .where(eq(referralEarnings.affiliateId, affiliateId));
  
  // Active referrals (made first recharge)
  const activeReferrals = await db
    .select({ count: count() })
    .from(referrals)
    .where(
      and(
        eq(referrals.referrerId, affiliateId),
        sql`${referrals.status} IN ('active', 'completed')`
      )
    );
  
  // Conversion rate
  const total = totalReferrals[0].count;
  const active = activeReferrals[0].count;
  const conversionRate = total > 0 ? Math.round((active / total) * 100) : 0;
  
  return {
    totalReferrals: total,
    activeReferrals: active,
    totalEarnings: Number(totalEarnings[0].sum) || 0,
    conversionRate,
  };
}

/**
 * Process first recharge bonus
 * Called when a referred customer makes their first recharge
 */
export async function processFirstRechargeBonus(
  referredCustomerId: number,
  rechargeAmount: number
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  // Get referral relationship
  const referral = await getReferralByReferredId(referredCustomerId);
  
  if (!referral) {
    return null; // Not a referred customer
  }
  
  if (referral.status !== "pending") {
    return null; // Already processed
  }
  
  // Get affiliate settings
  const settings = await getAffiliateSettings();
  
  if (!settings.isActive) {
    return null; // Program is disabled
  }
  
  // Calculate bonus
  const bonusAmount = Math.floor((rechargeAmount * settings.bonusPercentage) / 100);
  
  // Update referral record
  await db
    .update(referrals)
    .set({
      firstRechargeAt: new Date(),
      firstRechargeAmount: rechargeAmount,
      bonusGenerated: bonusAmount,
      status: "active",
    })
    .where(eq(referrals.id, referral.id));
  
  // Create earning record
  const [earningResult] = await db.insert(referralEarnings).values({
    affiliateId: referral.referrerId,
    referralId: referral.id,
    amount: bonusAmount,
    description: `Bônus de ${settings.bonusPercentage}% pela primeira recarga de Cliente #${referredCustomerId}`,
  });
  
  // Credit bonus to affiliate's balance (main balance)
  const affiliate = await db
    .select()
    .from(customers)
    .where(eq(customers.id, referral.referrerId))
    .limit(1);
  
  if (affiliate.length > 0) {
    const balanceBefore = affiliate[0].balance;
    const balanceAfter = balanceBefore + bonusAmount;
    
    await db
      .update(customers)
      .set({ balance: balanceAfter })
      .where(eq(customers.id, referral.referrerId));
    
    // Create transaction record
    await db.insert(balanceTransactions).values({
      customerId: referral.referrerId,
      amount: bonusAmount,
      type: "credit",
      description: `Bônus de afiliado - Primeira recarga de Cliente #${referredCustomerId}`,
      balanceBefore,
      balanceAfter,
      origin: "system",
      metadata: JSON.stringify({
        referralId: referral.id,
        referredCustomerId,
        rechargeAmount,
        bonusPercentage: settings.bonusPercentage,
        bonusAmount,
      }),
    });
  }
  
  return {
    referralId: referral.id,
    affiliateId: referral.referrerId,
    bonusAmount,
    earningId: earningResult.insertId,
  };
}

/**
 * Get all affiliates with their stats (for admin panel)
 */
export async function getAllAffiliatesWithStats() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const affiliates = await db
    .select({
      id: customers.id,
      pin: customers.pin,
      name: customers.name,
      email: customers.email,
      createdAt: customers.createdAt,
    })
    .from(customers)
    .where(
      sql`${customers.id} IN (SELECT DISTINCT ${referrals.referrerId} FROM ${referrals})`
    );
  
  const affiliatesWithStats = await Promise.all(
    affiliates.map(async (affiliate: typeof affiliates[0]) => {
      const stats = await getAffiliateStats(affiliate.id);
      
      // Get total recharged by referrals
      const totalRecharged = await db
        .select({ sum: sql<number>`COALESCE(SUM(${referrals.firstRechargeAmount}), 0)` })
        .from(referrals)
        .where(
          and(
            eq(referrals.referrerId, affiliate.id),
            sql`${referrals.firstRechargeAmount} IS NOT NULL`
          )
        );
      
      return {
        ...affiliate,
        ...stats,
        totalRecharged: Number(totalRecharged[0].sum) || 0,
      };
    })
  );
  
  return affiliatesWithStats;
}

/**
 * Get all referrals with details (for admin panel)
 */
export async function getAllReferralsWithDetails() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db
    .select({
      id: referrals.id,
      referrerId: referrals.referrerId,
      referrerName: sql<string>`referrer.name`,
      referrerEmail: sql<string>`referrer.email`,
      referredId: referrals.referredId,
      referredName: sql<string>`referred.name`,
      referredEmail: sql<string>`referred.email`,
      firstRechargeAt: referrals.firstRechargeAt,
      firstRechargeAmount: referrals.firstRechargeAmount,
      bonusGenerated: referrals.bonusGenerated,
      status: referrals.status,
      createdAt: referrals.createdAt,
    })
    .from(referrals)
    .leftJoin(
      sql`${customers} AS referrer`,
      sql`referrer.id = ${referrals.referrerId}`
    )
    .leftJoin(
      sql`${customers} AS referred`,
      sql`referred.id = ${referrals.referredId}`
    )
    .orderBy(desc(referrals.createdAt));
  
  return result;
}
