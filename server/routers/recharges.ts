import { z } from "zod";
import { publicProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { recharges } from "../../drizzle/schema";
import { eq, and, desc, sql } from "drizzle-orm";

/**
 * Router para gerenciamento de recargas de clientes
 * 
 * A tabela `recharges` é a fonte única de verdade para todas as recargas.
 * As tabelas `pix_transactions` e `stripe_transactions` servem apenas como logs auxiliares.
 */
export const rechargesRouter = router({
  /**
   * Listar recargas de um cliente com paginação e filtros
   */
  getMyRecharges: publicProcedure
    .input(
      z.object({
        customerId: z.number(),
        page: z.number().min(1).default(1),
        limit: z.number().min(1).max(100).default(20),
        paymentMethod: z.enum(["pix", "card", "crypto", "picpay"]).optional(),
        status: z.enum(["completed", "pending", "expired"]).optional(),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) {
        throw new Error("Database connection failed");
      }

      // Construir condições de filtro
      const conditions = [eq(recharges.customerId, input.customerId)];

      if (input.paymentMethod) {
        conditions.push(eq(recharges.paymentMethod, input.paymentMethod));
      }

      if (input.status) {
        conditions.push(eq(recharges.status, input.status));
      }

      // Buscar total de registros
      const totalResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(recharges)
        .where(and(...conditions));

      const total = Number(totalResult[0]?.count || 0);

      // Calcular paginação
      const totalPages = Math.ceil(total / input.limit);
      const offset = (input.page - 1) * input.limit;

      // Buscar recargas com paginação
      const results = await db
        .select()
        .from(recharges)
        .where(and(...conditions))
        .orderBy(desc(recharges.createdAt))
        .limit(input.limit)
        .offset(offset);

      return {
        data: results,
        pagination: {
          page: input.page,
          limit: input.limit,
          total,
          totalPages,
        },
      };
    }),

  /**
   * Obter detalhes de uma recarga específica
   */
  getRechargeById: publicProcedure
    .input(
      z.object({
        rechargeId: z.number(),
        customerId: z.number(), // Para segurança
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) {
        throw new Error("Database connection failed");
      }

      const result = await db
        .select()
        .from(recharges)
        .where(
          and(
            eq(recharges.id, input.rechargeId),
            eq(recharges.customerId, input.customerId)
          )
        )
        .limit(1);

      if (!result || result.length === 0) {
        throw new Error("Recarga não encontrada");
      }

      return result[0];
    }),
});
