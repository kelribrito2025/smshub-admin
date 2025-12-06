import { eq, desc } from 'drizzle-orm';
import { getDb } from './db';
import { activations, InsertActivation } from '../drizzle/schema';

/**
 * Create new activation
 */
export async function createActivation(data: InsertActivation) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  await db.insert(activations).values(data);
  
  // Get the last inserted activation by smshubActivationId
  return await getActivationBySmshubId(data.smshubActivationId || '');
}

/**
 * Get activation by ID
 */
export async function getActivationById(id: number) {
  const db = await getDb();
  if (!db) return null;

  const result = await db.select().from(activations).where(eq(activations.id, id)).limit(1);
  return result.length > 0 ? result[0] : null;
}

/**
 * Get activation by SMSHub activation ID
 */
export async function getActivationBySmshubId(smshubActivationId: string) {
  const db = await getDb();
  if (!db) return null;

  const result = await db
    .select()
    .from(activations)
    .where(eq(activations.smshubActivationId, smshubActivationId))
    .limit(1);

  return result.length > 0 ? result[0] : null;
}

/**
 * Update activation
 */
export async function updateActivation(
  id: number,
  data: Partial<Omit<InsertActivation, 'id'>>
) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  await db.update(activations).set(data).where(eq(activations.id, id));
}

/**
 * Get all activations with optional limit
 */
export async function getAllActivations(limit?: number) {
  const db = await getDb();
  if (!db) return [];

  let query = db.select().from(activations).orderBy(desc(activations.createdAt));

  if (limit) {
    query = query.limit(limit) as any;
  }

  return query;
}

/**
 * Get activations by status
 */
export async function getActivationsByStatus(
  status: 'pending' | 'active' | 'completed' | 'cancelled' | 'failed',
  limit?: number
) {
  const db = await getDb();
  if (!db) return [];

  let query = db
    .select()
    .from(activations)
    .where(eq(activations.status, status))
    .orderBy(desc(activations.createdAt));

  if (limit) {
    query = query.limit(limit) as any;
  }

  return query;
}
