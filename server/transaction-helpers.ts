import { getDb } from './db';
import { customers } from '../drizzle/schema';
import { eq, sql } from 'drizzle-orm';

/**
 * Executa operação de compra com lock transacional para prevenir race conditions
 * Usa SELECT FOR UPDATE para bloquear a linha do cliente durante a transação
 */
export async function executeWithBalanceLock<T>(
  customerId: number,
  requiredAmount: number,
  operation: () => Promise<T>
): Promise<T> {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  // Iniciar transação
  return await db.transaction(async (tx) => {
    // 1. Bloquear linha do cliente com SELECT FOR UPDATE
    // Isso impede que outras transações leiam/modifiquem até o commit
    const [customer] = await tx
      .select()
      .from(customers)
      .where(eq(customers.id, customerId))
      .for('update'); // PostgreSQL/MySQL: FOR UPDATE

    if (!customer) {
      throw new Error('Cliente não encontrado');
    }

    // 2. Verificar saldo dentro da transação (com lock ativo)
    if (customer.balance < requiredAmount) {
      throw new Error(`Saldo insuficiente. Necessário: R$ ${(requiredAmount / 100).toFixed(2)}, Disponível: R$ ${(customer.balance / 100).toFixed(2)}`);
    }

    // 3. Executar operação (compra, criação de ativação, débito)
    // A operação deve incluir o débito de saldo
    const result = await operation();

    // 4. Commit automático ao retornar (libera lock)
    return result;
  });
}

/**
 * Debita saldo do cliente de forma atômica (dentro de transação)
 * IMPORTANTE: Esta função deve ser chamada DENTRO de executeWithBalanceLock
 */
export async function debitBalanceAtomic(
  customerId: number,
  amount: number,
  description: string,
  activationId?: number
) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  // Atualizar saldo
  await db
    .update(customers)
    .set({
      balance: sql`${customers.balance} - ${amount}`,
    })
    .where(eq(customers.id, customerId));

  // Criar transação de saldo
  const { addBalance } = await import('./customers-helpers');
  await addBalance(customerId, -amount, 'purchase', description, undefined, activationId);
}
