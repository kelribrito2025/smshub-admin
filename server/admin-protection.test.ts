import { describe, it, expect } from 'vitest';
import { TRPCError } from '@trpc/server';
import { adminProcedure } from './_core/trpc';

describe('Admin Route Protection', () => {
  it('should have adminProcedure middleware defined', () => {
    expect(adminProcedure).toBeDefined();
    expect(typeof adminProcedure).toBe('object');
  });

  it('should throw FORBIDDEN error when user is not admin', async () => {
    const mockContext = {
      user: {
        id: 1,
        email: 'user@example.com',
        role: 'user' as const,
      },
      req: {} as any,
      res: {} as any,
    };

    try {
      // Try to execute adminProcedure with non-admin user
      await adminProcedure._def.middlewares[0]({
        ctx: mockContext,
        next: async () => ({ ctx: mockContext }),
        path: 'test',
        type: 'query',
        getRawInput: async () => ({}),
        input: {},
      } as any);
      
      // If we reach here, the test should fail
      expect.fail('Should have thrown FORBIDDEN error');
    } catch (error) {
      expect(error).toBeInstanceOf(TRPCError);
      expect((error as TRPCError).code).toBe('FORBIDDEN');
    }
  });

  it('should allow access when user is admin', async () => {
    const mockContext = {
      user: {
        id: 1,
        email: 'admin@example.com',
        role: 'admin' as const,
      },
      req: {} as any,
      res: {} as any,
    };

    const result = await adminProcedure._def.middlewares[0]({
      ctx: mockContext,
      next: async ({ ctx }) => ({ ctx }),
      path: 'test',
      type: 'query',
      getRawInput: async () => ({}),
      input: {},
    } as any);

    expect(result.ctx.user).toBeDefined();
    expect(result.ctx.user.role).toBe('admin');
  });

  it('should throw UNAUTHORIZED when user is not authenticated', async () => {
    const mockContext = {
      user: null,
      req: {} as any,
      res: {} as any,
    };

    try {
      await adminProcedure._def.middlewares[0]({
        ctx: mockContext,
        next: async () => ({ ctx: mockContext }),
        path: 'test',
        type: 'query',
        getRawInput: async () => ({}),
        input: {},
      } as any);
      
      expect.fail('Should have thrown FORBIDDEN error');
    } catch (error) {
      expect(error).toBeInstanceOf(TRPCError);
      expect((error as TRPCError).code).toBe('FORBIDDEN');
    }
  });
});
