import { getDb } from './db';
import { cancellationLogs, smsApis, customers, users } from '../drizzle/schema';
import { and, eq, gte, sql } from 'drizzle-orm';

/**
 * Check if customer is currently blocked from making purchases due to excessive cancellations
 * @param customerId - Customer ID to check
 * @param apiId - API ID to check against
 * @returns Object with isBlocked status and remaining block time in minutes
 */
export async function checkCancellationBlock(customerId: number, apiId: number): Promise<{
  isBlocked: boolean;
  remainingMinutes: number;
  message?: string;
}> {
  const db = await getDb();
  if (!db) throw new Error('Database connection failed');

  // Admins are exempt from cancellation limits
  // Get customer's user account to check role
  const [customer] = await db.select().from(customers).where(eq(customers.id, customerId)).limit(1);
  if (customer) {
    const [userAccount] = await db.select().from(users).where(eq(users.email, customer.email)).limit(1);
    if (userAccount?.role === 'admin') {
      return { isBlocked: false, remainingMinutes: 0 };
    }
  }

  // Get API configuration
  const [api] = await db.select().from(smsApis).where(eq(smsApis.id, apiId)).limit(1);
  if (!api) {
    return { isBlocked: false, remainingMinutes: 0 };
  }

  const { cancelLimit, cancelWindowMinutes, blockDurationMinutes } = api;

  // Calculate time window (now - cancelWindowMinutes)
  const windowStart = new Date(Date.now() - cancelWindowMinutes * 60 * 1000);

  // Count cancellations within window
  const [result] = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(cancellationLogs)
    .where(
      and(
        eq(cancellationLogs.customerId, customerId),
        eq(cancellationLogs.apiId, apiId),
        gte(cancellationLogs.timestamp, windowStart)
      )
    );

  const cancellationCount = Number(result?.count || 0);

  // If limit not reached, not blocked
  if (cancellationCount < cancelLimit) {
    return { isBlocked: false, remainingMinutes: 0 };
  }

  // Get the most recent cancellation timestamp
  const [lastCancellation] = await db
    .select({ timestamp: cancellationLogs.timestamp })
    .from(cancellationLogs)
    .where(
      and(
        eq(cancellationLogs.customerId, customerId),
        eq(cancellationLogs.apiId, apiId)
      )
    )
    .orderBy(sql`${cancellationLogs.timestamp} DESC`)
    .limit(1);

  if (!lastCancellation) {
    return { isBlocked: false, remainingMinutes: 0 };
  }

  // Calculate block expiration time
  const blockExpiresAt = new Date(lastCancellation.timestamp.getTime() + blockDurationMinutes * 60 * 1000);
  const now = new Date();

  // If block has expired, not blocked
  if (now >= blockExpiresAt) {
    return { isBlocked: false, remainingMinutes: 0 };
  }

  // Calculate remaining block time
  const remainingMs = blockExpiresAt.getTime() - now.getTime();
  const remainingMinutes = Math.ceil(remainingMs / (60 * 1000));

  return {
    isBlocked: true,
    remainingMinutes,
    message: `Você atingiu o limite de cancelamentos permitidos. Tente novamente em ${remainingMinutes} minuto${remainingMinutes > 1 ? 's' : ''}.`
  };
}

/**
 * Record a cancellation for rate limiting purposes
 * @param customerId - Customer ID who cancelled
 * @param apiId - API ID where cancellation occurred
 * @param activationId - Optional activation ID that was cancelled
 */
export async function recordCancellation(customerId: number, apiId: number, activationId?: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error('Database connection failed');

  await db.insert(cancellationLogs).values({
    customerId,
    apiId,
    activationId,
    timestamp: new Date(),
  });

  console.log(`[CancellationRateLimit] Recorded cancellation: customer=${customerId}, api=${apiId}, activation=${activationId}`);
}

/**
 * Check if customer can cancel an activation (always allowed even if blocked for purchases)
 * This validates against the cancellation limit before recording
 * @param customerId - Customer ID attempting to cancel
 * @param apiId - API ID of the activation
 * @returns Object with canCancel status and message
 */
export async function validateCancellation(customerId: number, apiId: number): Promise<{
  canCancel: boolean;
  willBeBlocked: boolean;
  message?: string;
}> {
  const db = await getDb();
  if (!db) throw new Error('Database connection failed');

  // Get API configuration
  const [api] = await db.select().from(smsApis).where(eq(smsApis.id, apiId)).limit(1);
  if (!api) {
    return { canCancel: true, willBeBlocked: false };
  }

  const { cancelLimit, cancelWindowMinutes, blockDurationMinutes } = api;

  // Calculate time window (now - cancelWindowMinutes)
  const windowStart = new Date(Date.now() - cancelWindowMinutes * 60 * 1000);

  // Count cancellations within window
  const [result] = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(cancellationLogs)
    .where(
      and(
        eq(cancellationLogs.customerId, customerId),
        eq(cancellationLogs.apiId, apiId),
        gte(cancellationLogs.timestamp, windowStart)
      )
    );

  const cancellationCount = Number(result?.count || 0);

  // User can always cancel active orders
  // But we warn them if they will be blocked after this cancellation
  const willBeBlocked = (cancellationCount + 1) >= cancelLimit;

  if (willBeBlocked) {
    return {
      canCancel: true,
      willBeBlocked: true,
      message: `Atenção: Este é seu ${cancellationCount + 1}º cancelamento em ${cancelWindowMinutes} minutos. Você será bloqueado por ${blockDurationMinutes} minutos após este cancelamento.`
    };
  }

  return { canCancel: true, willBeBlocked: false };
}
