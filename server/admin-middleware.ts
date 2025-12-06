import { TRPCError } from '@trpc/server';
import { protectedProcedure } from './_core/trpc';

/**
 * Admin-only procedure - requires user to be authenticated and have admin role
 */
export const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== 'admin') {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'Admin access required',
    });
  }

  return next({ ctx });
});
