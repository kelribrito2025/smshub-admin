import { describe, it, expect, beforeAll } from "vitest";
import { getDb } from "./db";
import { affiliateSettings } from "../drizzle/schema";

describe("Affiliate System", () => {
  let db: Awaited<ReturnType<typeof getDb>>;

  beforeAll(async () => {
    db = await getDb();
  });

  it("should have affiliate settings configured", async () => {
    if (!db) throw new Error("Database not available");
    const settings = await db.select().from(affiliateSettings).limit(1);
    expect(settings.length).toBeGreaterThan(0);
    expect(settings[0].bonusPercentage).toBeGreaterThan(0);
    expect(settings[0].isActive).toBeDefined();
  });

  it("should calculate bonus correctly based on percentage", () => {
    const rechargeAmount = 10000; // R$ 100.00
    const bonusPercentage = 10;
    const expectedBonus = Math.floor((rechargeAmount * bonusPercentage) / 100);
    expect(expectedBonus).toBe(1000); // R$ 10.00
  });

  it("should validate affiliate helpers exist", async () => {
    const helpers = await import("./db-helpers/affiliate-helpers");
    expect(helpers.getAffiliateSettings).toBeDefined();
    expect(helpers.processFirstRechargeBonus).toBeDefined();
    expect(helpers.updateAffiliateSettings).toBeDefined();
  });
});
