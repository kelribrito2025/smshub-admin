import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { getDb } from './db';
import { checkCancellationBlock, recordCancellation, validateCancellation } from './cancellation-rate-limit';
import { smsApis, cancellationLogs } from '../drizzle/schema';
import { eq, and, gte } from 'drizzle-orm';

describe('Cancellation Rate Limit System', () => {
  // Use existing customer and API from database
  const testCustomerId = 180002; // xkelrix@gmail.com
  let testApiId: number;

  beforeAll(async () => {
    const db = await getDb();
    if (!db) throw new Error('Database connection failed');

    // Get first active API
    const [api] = await db
      .select()
      .from(smsApis)
      .where(eq(smsApis.active, true))
      .limit(1);
    
    if (!api) throw new Error('No active API found in database');
    testApiId = api.id;

    // Clean up old test cancellation logs
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    await db
      .delete(cancellationLogs)
      .where(
        and(
          eq(cancellationLogs.customerId, testCustomerId),
          eq(cancellationLogs.apiId, testApiId),
          gte(cancellationLogs.timestamp, oneHourAgo)
        )
      );
  });

  afterAll(async () => {
    // Clean up test data
    const db = await getDb();
    if (!db) return;

    await db
      .delete(cancellationLogs)
      .where(
        and(
          eq(cancellationLogs.customerId, testCustomerId),
          eq(cancellationLogs.apiId, testApiId)
        )
      );
  });

  it('should allow purchase when no cancellations recorded', async () => {
    const blockStatus = await checkCancellationBlock(testCustomerId, testApiId);
    
    expect(blockStatus.isBlocked).toBe(false);
    expect(blockStatus.remainingMinutes).toBe(0);
  });

  it('should record cancellation with activation ID', async () => {
    const db = await getDb();
    if (!db) throw new Error('Database connection failed');

    const testActivationId = 999001;
    await recordCancellation(testCustomerId, testApiId, testActivationId);

    const [log] = await db
      .select()
      .from(cancellationLogs)
      .where(eq(cancellationLogs.activationId, testActivationId))
      .limit(1);

    expect(log).toBeDefined();
    expect(log.customerId).toBe(testCustomerId);
    expect(log.apiId).toBe(testApiId);
    expect(log.activationId).toBe(testActivationId);
    expect(log.timestamp).toBeInstanceOf(Date);

    // Clean up
    await db
      .delete(cancellationLogs)
      .where(eq(cancellationLogs.activationId, testActivationId));
  });

  it('should allow purchase with cancellations below limit', async () => {
    const db = await getDb();
    if (!db) throw new Error('Database connection failed');

    // Get API config
    const [api] = await db
      .select()
      .from(smsApis)
      .where(eq(smsApis.id, testApiId))
      .limit(1);

    const cancelLimit = api.cancelLimit || 5;

    // Record cancellations below limit (cancelLimit - 1)
    for (let i = 0; i < cancelLimit - 1; i++) {
      await recordCancellation(testCustomerId, testApiId, 999100 + i);
    }

    const blockStatus = await checkCancellationBlock(testCustomerId, testApiId);
    
    expect(blockStatus.isBlocked).toBe(false);
    expect(blockStatus.remainingMinutes).toBe(0);

    // Clean up
    await db
      .delete(cancellationLogs)
      .where(
        and(
          eq(cancellationLogs.customerId, testCustomerId),
          eq(cancellationLogs.apiId, testApiId)
        )
      );
  });

  it('should block purchase when cancellation limit reached', async () => {
    const db = await getDb();
    if (!db) throw new Error('Database connection failed');

    // Get API config
    const [api] = await db
      .select()
      .from(smsApis)
      .where(eq(smsApis.id, testApiId))
      .limit(1);

    const cancelLimit = api.cancelLimit || 5;

    // Record cancellations at limit
    for (let i = 0; i < cancelLimit; i++) {
      await recordCancellation(testCustomerId, testApiId, 999200 + i);
    }

    const blockStatus = await checkCancellationBlock(testCustomerId, testApiId);
    
    expect(blockStatus.isBlocked).toBe(true);
    expect(blockStatus.remainingMinutes).toBeGreaterThan(0);
    expect(blockStatus.message).toContain('limite de cancelamentos');

    // Clean up
    await db
      .delete(cancellationLogs)
      .where(
        and(
          eq(cancellationLogs.customerId, testCustomerId),
          eq(cancellationLogs.apiId, testApiId)
        )
      );
  });

  it('should warn user when approaching limit', async () => {
    const db = await getDb();
    if (!db) throw new Error('Database connection failed');

    // Get API config
    const [api] = await db
      .select()
      .from(smsApis)
      .where(eq(smsApis.id, testApiId))
      .limit(1);

    const cancelLimit = api.cancelLimit || 5;

    // Record cancellations 1 away from limit
    for (let i = 0; i < cancelLimit - 1; i++) {
      await recordCancellation(testCustomerId, testApiId, 999300 + i);
    }

    const validation = await validateCancellation(testCustomerId, testApiId);
    
    expect(validation.canCancel).toBe(true);
    expect(validation.willBeBlocked).toBe(true);
    expect(validation.message).toContain(`${cancelLimit}º cancelamento`);
    expect(validation.message).toContain('bloqueado');

    // Clean up
    await db
      .delete(cancellationLogs)
      .where(
        and(
          eq(cancellationLogs.customerId, testCustomerId),
          eq(cancellationLogs.apiId, testApiId)
        )
      );
  });

  it('should allow cancellation even when blocked', async () => {
    const db = await getDb();
    if (!db) throw new Error('Database connection failed');

    // Get API config
    const [api] = await db
      .select()
      .from(smsApis)
      .where(eq(smsApis.id, testApiId))
      .limit(1);

    const cancelLimit = api.cancelLimit || 5;

    // Record cancellations to reach block
    for (let i = 0; i < cancelLimit; i++) {
      await recordCancellation(testCustomerId, testApiId, 999400 + i);
    }

    // User should still be able to cancel active orders
    const validation = await validateCancellation(testCustomerId, testApiId);
    
    expect(validation.canCancel).toBe(true);

    // Clean up
    await db
      .delete(cancellationLogs)
      .where(
        and(
          eq(cancellationLogs.customerId, testCustomerId),
          eq(cancellationLogs.apiId, testApiId)
        )
      );
  });
});
