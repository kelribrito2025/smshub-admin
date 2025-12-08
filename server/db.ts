import { eq, and, isNull } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, customers, emailVerifications } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// TODO: add feature queries here as your schema grows.

/**
 * Payment Settings Management
 */
import { paymentSettings } from "../drizzle/schema";

export async function getPaymentSettings() {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get payment settings: database not available");
    return null;
  }

  const result = await db.select().from(paymentSettings).limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function updatePaymentSettings(pixEnabled: boolean, stripeEnabled: boolean) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot update payment settings: database not available");
    return null;
  }

  // Get existing settings
  const existing = await getPaymentSettings();
  
  if (existing) {
    // Update existing record
    await db.update(paymentSettings)
      .set({ pixEnabled, stripeEnabled })
      .where(eq(paymentSettings.id, existing.id));
    
    return await getPaymentSettings();
  } else {
    // Insert new record
    await db.insert(paymentSettings).values({ pixEnabled, stripeEnabled });
    return await getPaymentSettings();
  }
}

// ============================================================
// Email Verification Helpers
// ============================================================

/**
 * Generate a random 6-digit verification code
 */
export function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Create a new verification code for a customer
 */
export async function createVerificationCode(customerId: number): Promise<string> {
  const db = await getDb();
  if (!db) {
    throw new Error('Database not available');
  }

  const code = generateVerificationCode();
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

  await db.insert(emailVerifications).values({
    customerId,
    code,
    expiresAt,
  });

  console.log('[Email Verification] Code created:', { customerId, code, expiresAt });
  return code;
}

/**
 * Validate a verification code for a customer
 */
export async function validateVerificationCode(
  customerId: number, 
  code: string
): Promise<{ valid: boolean; error?: string }> {
  const db = await getDb();
  if (!db) {
    return { valid: false, error: 'Database not available' };
  }

  // Find verification code
  const [verification] = await db
    .select()
    .from(emailVerifications)
    .where(
      and(
        eq(emailVerifications.customerId, customerId),
        eq(emailVerifications.code, code),
        isNull(emailVerifications.usedAt)
      )
    )
    .limit(1);

  if (!verification) {
    console.log('[Email Verification] Code not found:', { customerId, code });
    return { valid: false, error: 'Código inválido' };
  }

  // Check if expired
  if (new Date() > verification.expiresAt) {
    console.log('[Email Verification] Code expired:', { customerId, code, expiresAt: verification.expiresAt });
    return { valid: false, error: 'Código expirado' };
  }

  // Mark code as used
  await db
    .update(emailVerifications)
    .set({ usedAt: new Date() })
    .where(eq(emailVerifications.id, verification.id));

  // Mark email as verified
  await db
    .update(customers)
    .set({ 
      emailVerified: true, 
      emailVerifiedAt: new Date() 
    })
    .where(eq(customers.id, customerId));

  console.log('[Email Verification] Code validated successfully:', { customerId, code });
  return { valid: true };
}
