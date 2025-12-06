import { z } from 'zod';
import { router, protectedProcedure } from '../_core/trpc';
import { 
  fetchExchangeRate, 
  updateExchangeRateForAPIs, 
  recalculatePricesForAPI,
  syncExchangeRateAndPrices,
  getExchangeRateInfo
} from '../exchange-rate';
import { TRPCError } from '@trpc/server';

export const exchangeRateRouter = router({
  /**
   * Get current exchange rate info (rate, last update, next update)
   */
  getInfo: protectedProcedure.query(async () => {
    try {
      const info = await getExchangeRateInfo();
      
      if (!info) {
        return {
          rate: null,
          lastUpdate: null,
          nextUpdate: null
        };
      }

      return info;
    } catch (error) {
      console.error('[Exchange Rate Router] Failed to get info:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Falha ao buscar informações de câmbio'
      });
    }
  }),

  /**
   * Manually fetch current exchange rate from AwesomeAPI
   */
  fetchCurrent: protectedProcedure.mutation(async () => {
    try {
      const rate = await fetchExchangeRate();
      return {
        rate,
        timestamp: new Date()
      };
    } catch (error) {
      console.error('[Exchange Rate Router] Failed to fetch:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Falha ao buscar cotação USD/BRL'
      });
    }
  }),

  /**
   * Update exchange rate for all USD APIs
   */
  updateAPIs: protectedProcedure.mutation(async () => {
    try {
      const count = await updateExchangeRateForAPIs();
      return {
        success: true,
        apisUpdated: count
      };
    } catch (error) {
      console.error('[Exchange Rate Router] Failed to update APIs:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Falha ao atualizar taxa de câmbio das APIs'
      });
    }
  }),

  /**
   * Recalculate prices for a specific API
   */
  recalculatePrices: protectedProcedure
    .input(z.object({
      apiId: z.number()
    }))
    .mutation(async ({ input }) => {
      try {
        const count = await recalculatePricesForAPI(input.apiId);
        return {
          success: true,
          pricesRecalculated: count
        };
      } catch (error) {
        console.error('[Exchange Rate Router] Failed to recalculate prices:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Falha ao recalcular preços'
        });
      }
    }),

  /**
   * Full sync: update exchange rates and recalculate all prices
   */
  fullSync: protectedProcedure.mutation(async () => {
    try {
      const result = await syncExchangeRateAndPrices();
      return {
        success: true,
        ...result
      };
    } catch (error) {
      console.error('[Exchange Rate Router] Failed to sync:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Falha ao sincronizar câmbio e preços'
      });
    }
  })
});
