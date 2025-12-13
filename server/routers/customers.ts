import { z } from 'zod';
import { router } from '../_core/trpc';
import { adminProcedure } from '../admin-middleware';
import {
  getAllCustomers,
  getCustomerById,
  getCustomerByEmail,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  addBalance,
  getCustomerTransactions,
  getAllTransactions,
  getCustomerStats,
} from '../customers-helpers';

export const customersRouter = router({
  /**
   * Get all customers
   */
  getAll: adminProcedure
    .input(z.object({ activeOnly: z.boolean().optional() }).optional())
    .query(async ({ input }) => {
      return getAllCustomers(input?.activeOnly || false);
    }),

  /**
   * Get customer by ID
   */
  getById: adminProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      return getCustomerById(input.id);
    }),

  /**
   * Get customer by email
   */
  getByEmail: adminProcedure
    .input(z.object({ email: z.string().email() }))
    .query(async ({ input }) => {
      return getCustomerByEmail(input.email);
    }),

  /**
   * Create a new customer
   */
  create: adminProcedure
    .input(
      z.object({
        name: z.string().min(1),
        email: z.string().email(),
        balance: z.number().default(0),
        active: z.boolean().default(true),
      })
    )
    .mutation(async ({ input }) => {
      // Check if email already exists
      const existing = await getCustomerByEmail(input.email);
      if (existing) {
        throw new Error('Email already registered');
      }

      await createCustomer({
        name: input.name,
        email: input.email,
        balance: Math.round(input.balance * 100), // Convert to cents
        active: input.active,
      });

      return { success: true };
    }),

  /**
   * Update customer
   */
  update: adminProcedure
    .input(
      z.object({
        id: z.number(),
        name: z.string().min(1).optional(),
        email: z.string().email().optional(),
        active: z.boolean().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { id, ...data } = input;

      // If email is being changed, check if it's already in use
      if (data.email) {
        const existing = await getCustomerByEmail(data.email);
        if (existing && existing.id !== id) {
          throw new Error('Email already in use by another customer');
        }
      }

      await updateCustomer(id, data);
      return { success: true };
    }),

  /**
   * Toggle customer active status
   */
  toggleActive: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const customer = await getCustomerById(input.id);
      if (!customer) {
        throw new Error('Customer not found');
      }

      await updateCustomer(input.id, { active: !customer.active });
      return { success: true, active: !customer.active };
    }),

  /**
   * Delete customer
   */
  delete: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await deleteCustomer(input.id);
      return { success: true };
    }),

  /**
   * Add balance to customer
   */
  addBalance: adminProcedure
    .input(
      z.object({
        customerId: z.number(),
        amount: z.number(),
        type: z.enum(['credit', 'debit', 'purchase', 'refund', 'withdrawal', 'hold']),
        description: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const result = await addBalance(
        input.customerId,
        input.amount, // Already in cents from frontend
        input.type,
        input.description,
        ctx.user?.id
      );

      // Balance update notification removed during validation phase
      // Saldo atualiza silenciosamente via SSE

      return {
        success: true,
        balanceBefore: result.balanceBefore / 100,
        balanceAfter: result.balanceAfter / 100,
      };
    }),

  /**
   * Get customer transactions
   */
  getTransactions: adminProcedure
    .input(
      z.object({
        customerId: z.number(),
        limit: z.number().default(50),
      })
    )
    .query(async ({ input }) => {
      const transactions = await getCustomerTransactions(input.customerId, input.limit);
      
      // Convert cents to reais
      return transactions.map(t => ({
        ...t,
        amount: t.amount / 100,
        balanceBefore: t.balanceBefore / 100,
        balanceAfter: t.balanceAfter / 100,
      }));
    }),

  /**
   * Get all transactions (admin view)
   */
  getAllTransactions: adminProcedure
    .input(z.object({ limit: z.number().default(100) }).optional())
    .query(async ({ input }) => {
      const transactions = await getAllTransactions(input?.limit || 100);
      
      // Convert cents to reais
      return transactions.map(t => ({
        ...t,
        transaction: {
          ...t.transaction,
          amount: t.transaction.amount / 100,
          balanceBefore: t.transaction.balanceBefore / 100,
          balanceAfter: t.transaction.balanceAfter / 100,
        },
      }));
    }),

  /**
   * Ban customer permanently
   */
  banCustomer: adminProcedure
    .input(
      z.object({
        id: z.number(),
        reason: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const customer = await getCustomerById(input.id);
      if (!customer) {
        throw new Error('Customer not found');
      }

      if (customer.banned) {
        throw new Error('Customer is already banned');
      }

      await updateCustomer(input.id, {
        banned: true,
        bannedAt: new Date(),
        bannedReason: input.reason || 'Violação dos termos de serviço',
      });

      return { success: true };
    }),

  /**
   * Unban customer
   */
  unbanCustomer: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const customer = await getCustomerById(input.id);
      if (!customer) {
        throw new Error('Customer not found');
      }

      if (!customer.banned) {
        throw new Error('Customer is not banned');
      }

      await updateCustomer(input.id, {
        banned: false,
        bannedAt: null,
        bannedReason: null,
      });

      return { success: true };
    }),

  /**
   * Get customer statistics
   */
  getStats: adminProcedure.query(async () => {
    const stats = await getCustomerStats();
    
    return {
      totalCustomers: stats.totalCustomers,
      activeCustomers: stats.activeCustomers,
      activeCustomersLast30Days: stats.activeCustomersLast30Days,
      totalBalance: stats.totalBalance / 100, // Convert to reais
      averageBalance: stats.averageBalance / 100, // Convert to reais
    };
  }),

  /**
   * Refund a purchase transaction
   */
  refundPurchase: adminProcedure
    .input(
      z.object({
        transactionId: z.number(),
        customerId: z.number(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // Get the original transaction to verify it's a purchase
      const transactions = await getCustomerTransactions(input.customerId, 1000);
      const originalTransaction = transactions.find(t => t.id === input.transactionId);
      
      if (!originalTransaction) {
        throw new Error('Transaction not found');
      }

      if (originalTransaction.type !== 'purchase') {
        throw new Error('Only purchase transactions can be refunded');
      }

      // Check if already refunded (look for existing refund with same relatedActivationId)
      const existingRefund = transactions.find(
        t => t.type === 'refund' && t.relatedActivationId === originalTransaction.relatedActivationId
      );
      
      if (existingRefund) {
        throw new Error('This purchase has already been refunded');
      }

      // Create refund transaction (positive amount to return money to customer)
      const refundAmount = Math.abs(originalTransaction.amount);
      const result = await addBalance(
        input.customerId,
        refundAmount,
        'refund',
        `Reembolso: ${originalTransaction.description}`,
        ctx.user?.id,
        originalTransaction.relatedActivationId ?? undefined,
        'admin'
      );

      return {
        success: true,
        refundAmount: refundAmount / 100,
        balanceAfter: result.balanceAfter / 100,
      };
    }),
});
