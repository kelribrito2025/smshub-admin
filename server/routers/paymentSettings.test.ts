import { describe, it, expect, beforeAll } from 'vitest';
import { appRouter } from '../routers';
import type { inferProcedureInput } from '@trpc/server';
import type { AppRouter } from '../routers';
import { getDb } from '../db';
import { paymentSettings } from '../../drizzle/schema';
import { eq } from 'drizzle-orm';

describe('Payment Settings Router', () => {
  let adminCaller: ReturnType<typeof appRouter.createCaller>;
  let publicCaller: ReturnType<typeof appRouter.createCaller>;

  beforeAll(async () => {
    // Admin context
    adminCaller = appRouter.createCaller({
      user: {
        id: 1,
        openId: 'admin-test',
        name: 'Admin Test',
        email: 'admin@test.com',
        role: 'admin',
        loginMethod: 'oauth',
        createdAt: new Date(),
        updatedAt: new Date(),
        lastSignedIn: new Date(),
      },
      req: {} as any,
      res: {} as any,
    });

    // Public context (no user)
    publicCaller = appRouter.createCaller({
      user: undefined,
      req: {} as any,
      res: {} as any,
    });

    // Clean up test data
    const db = await getDb();
    if (db) {
      await db.delete(paymentSettings);
    }
  });

  describe('get', () => {
    it('should return default settings when no settings exist', async () => {
      const result = await publicCaller.paymentSettings.get();

      expect(result).toEqual({
        pixEnabled: true,
        pixMinAmount: 1000,
        pixBonusPercentage: 5,
        stripeEnabled: true,
        stripeMinAmount: 2000,
        stripeBonusPercentage: 0,
      });
    });

    it('should return existing settings from database', async () => {
      // First create settings
      await adminCaller.paymentSettings.update({
        pixEnabled: false,
        pixMinAmount: 1500,
        pixBonusPercentage: 10,
        stripeEnabled: true,
        stripeMinAmount: 2500,
        stripeBonusPercentage: 3,
      });

      const result = await publicCaller.paymentSettings.get();

      expect(result.pixEnabled).toBe(false);
      expect(result.pixMinAmount).toBe(1500);
      expect(result.pixBonusPercentage).toBe(10);
      expect(result.stripeEnabled).toBe(true);
      expect(result.stripeMinAmount).toBe(2500);
      expect(result.stripeBonusPercentage).toBe(3);
    });
  });

  describe('update', () => {
    it('should require admin role', async () => {
      await expect(
        publicCaller.paymentSettings.update({
          pixEnabled: false,
        })
      ).rejects.toThrow();
    });

    it('should update PIX settings only', async () => {
      const result = await adminCaller.paymentSettings.update({
        pixEnabled: true,
        pixMinAmount: 2000,
        pixBonusPercentage: 8,
      });

      expect(result.pixEnabled).toBe(true);
      expect(result.pixMinAmount).toBe(2000);
      expect(result.pixBonusPercentage).toBe(8);
      // Stripe settings should remain unchanged
      expect(result.stripeEnabled).toBeDefined();
      expect(result.stripeMinAmount).toBeDefined();
      expect(result.stripeBonusPercentage).toBeDefined();
    });

    it('should update Stripe settings only', async () => {
      const result = await adminCaller.paymentSettings.update({
        stripeEnabled: false,
        stripeMinAmount: 3000,
        stripeBonusPercentage: 5,
      });

      expect(result.stripeEnabled).toBe(false);
      expect(result.stripeMinAmount).toBe(3000);
      expect(result.stripeBonusPercentage).toBe(5);
      // PIX settings should remain unchanged
      expect(result.pixEnabled).toBeDefined();
      expect(result.pixMinAmount).toBeDefined();
      expect(result.pixBonusPercentage).toBeDefined();
    });

    it('should update all settings at once', async () => {
      const result = await adminCaller.paymentSettings.update({
        pixEnabled: true,
        pixMinAmount: 1000,
        pixBonusPercentage: 5,
        stripeEnabled: true,
        stripeMinAmount: 2000,
        stripeBonusPercentage: 0,
      });

      expect(result).toEqual({
        pixEnabled: true,
        pixMinAmount: 1000,
        pixBonusPercentage: 5,
        stripeEnabled: true,
        stripeMinAmount: 2000,
        stripeBonusPercentage: 0,
      });
    });

    it('should validate minAmount is not negative', async () => {
      await expect(
        adminCaller.paymentSettings.update({
          pixMinAmount: -100,
        })
      ).rejects.toThrow();
    });

    it('should validate bonusPercentage is between 0 and 100', async () => {
      await expect(
        adminCaller.paymentSettings.update({
          pixBonusPercentage: 150,
        })
      ).rejects.toThrow();

      await expect(
        adminCaller.paymentSettings.update({
          stripeBonusPercentage: -5,
        })
      ).rejects.toThrow();
    });

    it('should accept bonus percentage at boundaries (0 and 100)', async () => {
      const result1 = await adminCaller.paymentSettings.update({
        pixBonusPercentage: 0,
      });
      expect(result1.pixBonusPercentage).toBe(0);

      const result2 = await adminCaller.paymentSettings.update({
        stripeBonusPercentage: 100,
      });
      expect(result2.stripeBonusPercentage).toBe(100);
    });
  });
});
