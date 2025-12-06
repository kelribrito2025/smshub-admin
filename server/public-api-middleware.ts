import { TRPCError } from '@trpc/server';
import { publicProcedure } from './_core/trpc';
import { validateApiKey } from './api-keys-helpers';

/**
 * Public API procedure - requires valid API key authentication
 * Use this for endpoints that external applications (like sales dashboard) will consume
 */
export const publicApiProcedure = publicProcedure.use(async ({ ctx, next }) => {
  // Get API key from header
  const apiKey = ctx.req.headers['x-api-key'] as string;

  if (!apiKey) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'API key is required. Include X-API-Key header in your request.',
    });
  }

  // Validate API key
  const isValid = await validateApiKey(apiKey);

  if (!isValid) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'Invalid or expired API key',
    });
  }

  return next({ ctx });
});
