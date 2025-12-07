import { z } from 'zod';
import { router } from '../_core/trpc';
import { adminProcedure } from '../admin-middleware';
import { getDb } from '../db';
import { balanceTransactions, customers, activations, services, countries } from '../../drizzle/schema';
import { eq, and, gte, lte, desc, or, like, sql } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';

/**
 * Audit Router - Sistema de Auditoria de Saldo
 * 
 * Rastreia todas as alterações de saldo dos clientes com:
 * - Timeline completa de transações
 * - Filtros avançados (cliente, ativação, data, tipo)
 * - Exportação para PDF
 * - Logs imutáveis
 */
export const auditRouter = router({
  /**
   * Listar transações com filtros avançados
   */
  getTransactions: adminProcedure
    .input(z.object({
      customerId: z.number().optional(),
      activationId: z.number().optional(),
      searchTerm: z.string().optional(), // Buscar por nome, email ou PIN do cliente
      type: z.enum(['credit', 'debit', 'purchase', 'refund', 'all']).default('all'),
      origin: z.enum(['api', 'customer', 'admin', 'system', 'all']).default('all'),
      startDate: z.string().optional(), // ISO date string
      endDate: z.string().optional(), // ISO date string
      page: z.number().default(1),
      limit: z.number().default(50),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });

      const offset = (input.page - 1) * input.limit;

      // Construir filtros dinâmicos
      const filters: any[] = [];

      if (input.customerId) {
        filters.push(eq(balanceTransactions.customerId, input.customerId));
      }

      if (input.activationId) {
        filters.push(eq(balanceTransactions.relatedActivationId, input.activationId));
      }

      if (input.type !== 'all') {
        filters.push(eq(balanceTransactions.type, input.type));
      }

      if (input.origin !== 'all') {
        filters.push(eq(balanceTransactions.origin, input.origin));
      }

      if (input.startDate) {
        filters.push(gte(balanceTransactions.createdAt, new Date(input.startDate)));
      }

      if (input.endDate) {
        filters.push(lte(balanceTransactions.createdAt, new Date(input.endDate)));
      }

      // Se houver busca por termo, precisamos fazer join com customers
      let query;
      if (input.searchTerm) {
        const searchPattern = `%${input.searchTerm}%`;
        query = db
          .select({
            transaction: balanceTransactions,
            customer: customers,
            activation: activations,
            service: services,
            country: countries,
          })
          .from(balanceTransactions)
          .leftJoin(customers, eq(balanceTransactions.customerId, customers.id))
          .leftJoin(activations, eq(balanceTransactions.relatedActivationId, activations.id))
          .leftJoin(services, eq(activations.serviceId, services.id))
          .leftJoin(countries, eq(activations.countryId, countries.id))
          .where(
            and(
              ...filters,
              or(
                like(customers.name, searchPattern),
                like(customers.email, searchPattern),
                sql`CAST(${customers.pin} AS CHAR) LIKE ${searchPattern}`
              )
            )
          )
          .orderBy(desc(balanceTransactions.createdAt))
          .limit(input.limit)
          .offset(offset);
      } else {
        query = db
          .select({
            transaction: balanceTransactions,
            customer: customers,
            activation: activations,
            service: services,
            country: countries,
          })
          .from(balanceTransactions)
          .leftJoin(customers, eq(balanceTransactions.customerId, customers.id))
          .leftJoin(activations, eq(balanceTransactions.relatedActivationId, activations.id))
          .leftJoin(services, eq(activations.serviceId, services.id))
          .leftJoin(countries, eq(activations.countryId, countries.id))
          .where(filters.length > 0 ? and(...filters) : undefined)
          .orderBy(desc(balanceTransactions.createdAt))
          .limit(input.limit)
          .offset(offset);
      }

      const results = await query;

      // Contar total de registros
      let countQuery;
      if (input.searchTerm) {
        const searchPattern = `%${input.searchTerm}%`;
        countQuery = db
          .select({ count: sql<number>`count(*)` })
          .from(balanceTransactions)
          .leftJoin(customers, eq(balanceTransactions.customerId, customers.id))
          .where(
            and(
              ...filters,
              or(
                like(customers.name, searchPattern),
                like(customers.email, searchPattern),
                sql`CAST(${customers.pin} AS CHAR) LIKE ${searchPattern}`
              )
            )
          );
      } else {
        countQuery = db
          .select({ count: sql<number>`count(*)` })
          .from(balanceTransactions)
          .where(filters.length > 0 ? and(...filters) : undefined);
      }

      const countResult = await countQuery;
      const total = Number(countResult[0]?.count || 0);

      return {
        data: results,
        pagination: {
          page: input.page,
          limit: input.limit,
          total,
          totalPages: Math.ceil(total / input.limit),
        },
      };
    }),

  /**
   * Obter estatísticas de auditoria
   */
  getStats: adminProcedure
    .input(z.object({
      customerId: z.number().optional(),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });

      const filters: any[] = [];

      if (input.customerId) {
        filters.push(eq(balanceTransactions.customerId, input.customerId));
      }

      if (input.startDate) {
        filters.push(gte(balanceTransactions.createdAt, new Date(input.startDate)));
      }

      if (input.endDate) {
        filters.push(lte(balanceTransactions.createdAt, new Date(input.endDate)));
      }

      const whereClause = filters.length > 0 ? and(...filters) : undefined;

      // Total de transações
      const totalResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(balanceTransactions)
        .where(whereClause);

      // Total por tipo
      const byTypeResult = await db
        .select({
          type: balanceTransactions.type,
          count: sql<number>`count(*)`,
          totalAmount: sql<number>`sum(${balanceTransactions.amount})`,
        })
        .from(balanceTransactions)
        .where(whereClause)
        .groupBy(balanceTransactions.type);

      // Total por origem
      const byOriginResult = await db
        .select({
          origin: balanceTransactions.origin,
          count: sql<number>`count(*)`,
        })
        .from(balanceTransactions)
        .where(whereClause)
        .groupBy(balanceTransactions.origin);

      return {
        total: Number(totalResult[0]?.count || 0),
        byType: byTypeResult.map(r => ({
          type: r.type,
          count: Number(r.count),
          totalAmount: Number(r.totalAmount || 0),
        })),
        byOrigin: byOriginResult.map(r => ({
          origin: r.origin,
          count: Number(r.count),
        })),
      };
    }),

  /**
   * Exportar histórico de transações para análise
   * Retorna dados formatados prontos para PDF
   */
  exportTransactions: adminProcedure
    .input(z.object({
      customerId: z.number(),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });

      // Buscar cliente
      const customerResult = await db
        .select()
        .from(customers)
        .where(eq(customers.id, input.customerId))
        .limit(1);

      if (!customerResult || customerResult.length === 0) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Cliente não encontrado' });
      }

      const customer = customerResult[0];

      // Buscar transações
      const filters: any[] = [eq(balanceTransactions.customerId, input.customerId)];

      if (input.startDate) {
        filters.push(gte(balanceTransactions.createdAt, new Date(input.startDate)));
      }

      if (input.endDate) {
        filters.push(lte(balanceTransactions.createdAt, new Date(input.endDate)));
      }

      const transactions = await db
        .select({
          transaction: balanceTransactions,
          activation: activations,
          service: services,
          country: countries,
        })
        .from(balanceTransactions)
        .leftJoin(activations, eq(balanceTransactions.relatedActivationId, activations.id))
        .leftJoin(services, eq(activations.serviceId, services.id))
        .leftJoin(countries, eq(activations.countryId, countries.id))
        .where(and(...filters))
        .orderBy(desc(balanceTransactions.createdAt));

      return {
        customer: {
          id: customer.id,
          name: customer.name,
          email: customer.email,
          pin: customer.pin,
          currentBalance: customer.balance,
        },
        transactions: transactions.map(t => ({
          id: t.transaction.id,
          type: t.transaction.type,
          amount: t.transaction.amount,
          description: t.transaction.description,
          balanceBefore: t.transaction.balanceBefore,
          balanceAfter: t.transaction.balanceAfter,
          origin: t.transaction.origin,
          ipAddress: t.transaction.ipAddress,
          metadata: t.transaction.metadata,
          createdAt: t.transaction.createdAt,
          activation: t.activation ? {
            id: t.activation.id,
            phoneNumber: t.activation.phoneNumber,
            service: t.service?.name,
            country: t.country?.name,
          } : null,
        })),
        period: {
          startDate: input.startDate,
          endDate: input.endDate,
        },
        generatedAt: new Date().toISOString(),
      };
    }),

  /**
   * Verificar inconsistências de saldo
   * Compara saldo calculado (soma de transações) com saldo real do cliente
   * Detecção passiva - sem overhead, usa dados já carregados
   */
  checkInconsistencies: adminProcedure
    .input(z.object({
      customerId: z.number().optional(), // Se não fornecido, verifica todos os clientes
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });

      // Buscar clientes para verificar
      let customersToCheck;
      if (input.customerId) {
        customersToCheck = await db
          .select()
          .from(customers)
          .where(eq(customers.id, input.customerId));
      } else {
        // Verificar apenas clientes ativos com transações
        customersToCheck = await db
          .select()
          .from(customers)
          .where(eq(customers.active, true));
      }

      const inconsistencies: any[] = [];

      for (const customer of customersToCheck) {
        // Calcular saldo esperado (soma de todas as transações)
        const transactionsResult = await db
          .select({
            totalCredits: sql<number>`sum(case when ${balanceTransactions.amount} > 0 then ${balanceTransactions.amount} else 0 end)`,
            totalDebits: sql<number>`sum(case when ${balanceTransactions.amount} < 0 then abs(${balanceTransactions.amount}) else 0 end)`,
            count: sql<number>`count(*)`,
          })
          .from(balanceTransactions)
          .where(eq(balanceTransactions.customerId, customer.id));

        const totalCredits = Number(transactionsResult[0]?.totalCredits || 0);
        const totalDebits = Number(transactionsResult[0]?.totalDebits || 0);
        const transactionCount = Number(transactionsResult[0]?.count || 0);

        // Saldo esperado = créditos - débitos
        const expectedBalance = totalCredits - totalDebits;
        const actualBalance = customer.balance;
        const difference = actualBalance - expectedBalance;

        // Se houver diferença, registrar inconsistência
        if (difference !== 0 && transactionCount > 0) {
          inconsistencies.push({
            customerId: customer.id,
            customerName: customer.name,
            customerEmail: customer.email,
            customerPin: customer.pin,
            expectedBalance,
            actualBalance,
            difference,
            transactionCount,
            severity: Math.abs(difference) > 1000 ? 'high' : Math.abs(difference) > 100 ? 'medium' : 'low',
          });
        }
      }

      return {
        inconsistencies,
        totalChecked: customersToCheck.length,
        totalInconsistent: inconsistencies.length,
      };
    }),

  /**
   * Corrigir saldo de um cliente
   * Ajusta o saldo real para corresponder ao saldo esperado (soma das transações)
   * Cria uma transação de ajuste para manter auditoria completa
   */
  fixBalance: adminProcedure
    .input(z.object({
      customerId: z.number(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });

      // Buscar cliente
      const customerResult = await db
        .select()
        .from(customers)
        .where(eq(customers.id, input.customerId))
        .limit(1);

      if (!customerResult || customerResult.length === 0) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Cliente não encontrado' });
      }

      const customer = customerResult[0];

      // Calcular saldo esperado (soma de todas as transações)
      const transactionsResult = await db
        .select({
          totalCredits: sql<number>`sum(case when ${balanceTransactions.amount} > 0 then ${balanceTransactions.amount} else 0 end)`,
          totalDebits: sql<number>`sum(case when ${balanceTransactions.amount} < 0 then abs(${balanceTransactions.amount}) else 0 end)`,
        })
        .from(balanceTransactions)
        .where(eq(balanceTransactions.customerId, customer.id));

      const totalCredits = Number(transactionsResult[0]?.totalCredits || 0);
      const totalDebits = Number(transactionsResult[0]?.totalDebits || 0);
      const expectedBalance = totalCredits - totalDebits;
      const actualBalance = customer.balance;
      const difference = actualBalance - expectedBalance;

      // Se não houver diferença, não fazer nada
      if (difference === 0) {
        return {
          success: true,
          message: 'Saldo já está correto',
          balanceBefore: actualBalance,
          balanceAfter: actualBalance,
          adjustment: 0,
        };
      }

      // Ajustar saldo do cliente
      await db
        .update(customers)
        .set({ balance: expectedBalance })
        .where(eq(customers.id, customer.id));

      // Criar transação de ajuste para manter auditoria
      const adjustmentAmount = expectedBalance - actualBalance;
      await db.insert(balanceTransactions).values({
        customerId: customer.id,
        type: adjustmentAmount > 0 ? 'credit' : 'debit',
        amount: adjustmentAmount,
        balanceBefore: actualBalance,
        balanceAfter: expectedBalance,
        description: `Ajuste automático de saldo - Correção de inconsistência detectada (diferença: R$ ${(Math.abs(difference) / 100).toFixed(2)})`,
        origin: 'admin',
        metadata: JSON.stringify({
          type: 'balance_correction',
          previousBalance: actualBalance,
          expectedBalance,
          difference,
        }),
      });

      return {
        success: true,
        message: 'Saldo corrigido com sucesso',
        balanceBefore: actualBalance,
        balanceAfter: expectedBalance,
        adjustment: adjustmentAmount,
      };
    }),
});

