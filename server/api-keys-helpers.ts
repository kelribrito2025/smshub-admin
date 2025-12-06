import { eq } from 'drizzle-orm';
import { getDb } from './db';
import { apiKeys, InsertApiKey } from '../drizzle/schema';
import { nanoid } from 'nanoid';

/**
 * Generate a new API key
 */
export function generateApiKey(): string {
  return `sk_${nanoid(48)}`;
}

/**
 * Create a new API key
 */
export async function createApiKey(data: Omit<InsertApiKey, 'key'>): Promise<string> {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  const key = generateApiKey();

  await db.insert(apiKeys).values({
    ...data,
    key,
  });

  return key;
}

/**
 * Get all API keys
 */
export async function getAllApiKeys() {
  const db = await getDb();
  if (!db) return [];

  return db.select().from(apiKeys).orderBy(apiKeys.createdAt);
}

/**
 * Get API key by key string
 */
export async function getApiKeyByKey(key: string) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(apiKeys).where(eq(apiKeys.key, key)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

/**
 * Update API key last used timestamp
 */
export async function updateApiKeyLastUsed(id: number) {
  const db = await getDb();
  if (!db) return;

  await db.update(apiKeys).set({ lastUsedAt: new Date() }).where(eq(apiKeys.id, id));
}

/**
 * Toggle API key active status
 */
export async function toggleApiKeyActive(id: number) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  const apiKey = await db.select().from(apiKeys).where(eq(apiKeys.id, id)).limit(1);
  if (apiKey.length === 0) throw new Error('API key not found');

  const newStatus = apiKey[0].active === 1 ? 0 : 1;
  await db.update(apiKeys).set({ active: newStatus }).where(eq(apiKeys.id, id));

  return newStatus === 1;
}

/**
 * Delete API key
 */
export async function deleteApiKey(id: number) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  await db.delete(apiKeys).where(eq(apiKeys.id, id));
}

/**
 * Validate API key and check if it's active and not expired
 */
export async function validateApiKey(key: string): Promise<boolean> {
  const apiKey = await getApiKeyByKey(key);

  if (!apiKey) return false;
  if (apiKey.active !== 1) return false;
  if (apiKey.expiresAt && apiKey.expiresAt < new Date()) return false;

  // Update last used timestamp
  await updateApiKeyLastUsed(apiKey.id);

  return true;
}
