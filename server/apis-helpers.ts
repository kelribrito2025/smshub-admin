import { getDb } from './db';
import { smsApis, type SmsApi, type InsertSmsApi } from '../drizzle/schema';
import { eq, asc } from 'drizzle-orm';

/**
 * Get all SMS APIs ordered by priority
 */
export async function getAllApis(): Promise<SmsApi[]> {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  
  return await db.select().from(smsApis).orderBy(asc(smsApis.priority));
}

/**
 * Get only active APIs ordered by priority (for fallback system)
 */
export async function getActiveApis(): Promise<SmsApi[]> {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  
  return await db.select()
    .from(smsApis)
    .where(eq(smsApis.active, true))
    .orderBy(asc(smsApis.priority));
}

/**
 * Get API by ID
 */
export async function getApiById(id: number): Promise<SmsApi | null> {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  
  const results = await db.select().from(smsApis).where(eq(smsApis.id, id));
  return results[0] || null;
}

/**
 * Create new SMS API
 */
export async function createApi(data: Omit<InsertSmsApi, 'id' | 'createdAt' | 'updatedAt'>): Promise<SmsApi> {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  
  // Convert profitPercentage to string if it's a number (for MySQL decimal type)
  const insertData: any = { ...data };
  if (typeof insertData.profitPercentage === 'number') {
    insertData.profitPercentage = insertData.profitPercentage.toFixed(2);
  }
  
  const result = await db.insert(smsApis).values(insertData);
  const insertId = Number(result[0].insertId);
  
  const created = await getApiById(insertId);
  if (!created) throw new Error('Failed to create API');
  
  return created;
}

/**
 * Update existing SMS API
 */
export async function updateApi(id: number, data: Partial<Omit<SmsApi, 'id' | 'createdAt' | 'updatedAt'>>): Promise<SmsApi> {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  
  // Convert profitPercentage to string if it's a number (for MySQL decimal type)
  const updateData: any = { ...data };
  if (typeof updateData.profitPercentage === 'number') {
    updateData.profitPercentage = updateData.profitPercentage.toFixed(2);
  }
  
  console.log('[updateApi] Updating API', id, 'with data:', updateData);
  
  await db.update(smsApis).set(updateData).where(eq(smsApis.id, id));
  
  const updated = await getApiById(id);
  if (!updated) throw new Error('API not found after update');
  
  console.log('[updateApi] Updated API:', updated);
  
  return updated;
}

/**
 * Delete SMS API
 */
export async function deleteApi(id: number): Promise<boolean> {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  
  await db.delete(smsApis).where(eq(smsApis.id, id));
  return true;
}

/**
 * Toggle API active status
 */
export async function toggleApiActive(id: number): Promise<SmsApi> {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  
  const api = await getApiById(id);
  if (!api) throw new Error('API not found');
  
  return await updateApi(id, { active: !api.active });
}
