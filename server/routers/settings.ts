import { z } from 'zod';
import { router } from '../_core/trpc';
import { adminProcedure } from '../admin-middleware';
import { getSetting, upsertSetting, getAllSettings } from '../db-helpers';
import { SMSHubClient } from '../smshub-client';

export const settingsRouter = router({
  /**
   * Get all settings
   */
  getAll: adminProcedure.query(async () => {
    return getAllSettings();
  }),

  /**
   * Get specific setting by key
   */
  get: adminProcedure
    .input(z.object({ key: z.string() }))
    .query(async ({ input }) => {
      return getSetting(input.key);
    }),

  /**
   * Update setting
   */
  update: adminProcedure
    .input(
      z.object({
        key: z.string(),
        value: z.string(),
        description: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      await upsertSetting({
        key: input.key,
        value: input.value,
        description: input.description || null,
      });

      return { success: true };
    }),

  /**
   * Set SMSHub API key
   */
  setApiKey: adminProcedure
    .input(z.object({ apiKey: z.string().min(1) }))
    .mutation(async ({ input }) => {
      // Test the API key first
      try {
        const client = new SMSHubClient(input.apiKey);
        const balance = await client.getBalance();
        
        // If we got here, the API key is valid
        await upsertSetting({
          key: 'smshub_api_key',
          value: input.apiKey,
          description: 'SMSHub API Key',
        });

        return { 
          success: true, 
          balance: balance.balance,
          message: 'API Key válida! Saldo atual: ' + balance.balance.toFixed(2)
        };
      } catch (error: any) {
        // Provide more helpful error messages
        if (error.message.includes('BAD_KEY')) {
          throw new Error('API Key inválida. Verifique se você copiou corretamente a chave do painel SMSHub.');
        } else if (error.message.includes('ECONNREFUSED') || error.message.includes('ETIMEDOUT')) {
          throw new Error('Não foi possível conectar ao SMSHub. Verifique sua conexão com a internet.');
        } else {
          throw new Error(`Erro ao validar API Key: ${error.message}`);
        }
      }
    }),

  /**
   * Get SMSHub account balance
   */
  getBalance: adminProcedure.query(async () => {
    const apiKeySetting = await getSetting('smshub_api_key');
    if (!apiKeySetting || !apiKeySetting.value) {
      throw new Error('SMSHub API key not configured');
    }

    const client = new SMSHubClient(apiKeySetting.value);
    const balance = await client.getBalance();

    return balance;
  }),

  /**
   * Set default markup settings
   */
  setDefaultMarkup: adminProcedure
    .input(
      z.object({
        markupPercentage: z.number().min(0).max(1000),
        markupFixed: z.number().min(0),
      })
    )
    .mutation(async ({ input }) => {
      await upsertSetting({
        key: 'default_markup_percentage',
        value: input.markupPercentage.toString(),
        description: 'Default markup percentage',
      });

      await upsertSetting({
        key: 'default_markup_fixed',
        value: input.markupFixed.toString(),
        description: 'Default fixed markup in cents',
      });

      return { success: true };
    }),

  /**
   * Get default markup settings
   */
  getDefaultMarkup: adminProcedure.query(async () => {
    const percentage = await getSetting('default_markup_percentage');
    const fixed = await getSetting('default_markup_fixed');

    return {
      markupPercentage: percentage ? parseInt(percentage.value || '0') : 0,
      markupFixed: fixed ? parseInt(fixed.value || '0') : 0,
    };
  }),
});
