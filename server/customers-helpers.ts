import { eq, desc, sql, gte } from "drizzle-orm";
import { getDb } from "./db";
import { customers, balanceTransactions, activations, type InsertCustomer, type InsertBalanceTransaction } from "../drizzle/schema";

/**
 * Get all customers
 */
export async function getAllCustomers(activeOnly: boolean = false) {
  const db = await getDb();
  if (!db) return [];

  let query = db.select().from(customers);
  
  if (activeOnly) {
    query = query.where(eq(customers.active, true)) as any;
  }

  return query.orderBy(desc(customers.createdAt));
}

/**
 * Get customer by ID
 */
export async function getCustomerById(id: number) {
  const db = await getDb();
  if (!db) return null;

  const result = await db.select().from(customers).where(eq(customers.id, id)).limit(1);
  return result[0] || null;
}

/**
 * Get customer by email
 */
export async function getCustomerByEmail(email: string) {
  const db = await getDb();
  if (!db) return null;

  const result = await db.select().from(customers).where(eq(customers.email, email)).limit(1);
  return result[0] || null;
}

/**
 * Get customer by PIN
 */
export async function getCustomerByPin(pin: number) {
  const db = await getDb();
  if (!db) return null;

  const result = await db.select().from(customers).where(eq(customers.pin, pin)).limit(1);
  return result[0] || null;
}

/**
 * Get next available PIN
 */
export async function getNextPin() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.select({ maxPin: sql<number>`MAX(${customers.pin})` }).from(customers);
  const maxPin = result[0]?.maxPin || 0;
  return maxPin + 1;
}

/**
 * Create a new customer
 */
export async function createCustomer(data: Omit<InsertCustomer, 'pin'>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Auto-generate next PIN
  const pin = await getNextPin();
  
  await db.insert(customers).values({ ...data, pin });
  
  // Return the created customer
  const created = await getCustomerByEmail(data.email);
  if (!created) throw new Error("Failed to create customer");
  
  return created;
}

/**
 * Update customer
 */
export async function updateCustomer(id: number, data: Partial<InsertCustomer>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(customers).set(data).where(eq(customers.id, id));
}

/**
 * Delete customer
 */
export async function deleteCustomer(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.delete(customers).where(eq(customers.id, id));
}

/**
 * Add balance to customer (creates transaction record)
 */
export async function addBalance(
  customerId: number,
  amount: number,
  type: "credit" | "debit" | "purchase" | "refund" | "withdrawal" | "hold",
  description: string,
  createdBy?: number,
  relatedActivationId?: number
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const customer = await getCustomerById(customerId);
  if (!customer) throw new Error("Customer not found");

  const balanceBefore = customer.balance;
  const balanceAfter = balanceBefore + amount;

  // Update customer balance
  await updateCustomer(customerId, { balance: balanceAfter });

  // Create transaction record
  await db.insert(balanceTransactions).values({
    customerId,
    amount,
    type,
    description,
    balanceBefore,
    balanceAfter,
    relatedActivationId,
    createdBy,
  });

  return { balanceBefore, balanceAfter };
}

/**
 * Get customer balance transactions
 */
export async function getCustomerTransactions(customerId: number, limit: number = 50) {
  const db = await getDb();
  if (!db) return [];

  return db
    .select()
    .from(balanceTransactions)
    .where(eq(balanceTransactions.customerId, customerId))
    .orderBy(desc(balanceTransactions.createdAt))
    .limit(limit);
}

/**
 * Get all balance transactions (for admin)
 */
export async function getAllTransactions(limit: number = 100) {
  const db = await getDb();
  if (!db) return [];

  return db
    .select({
      transaction: balanceTransactions,
      customer: customers,
    })
    .from(balanceTransactions)
    .leftJoin(customers, eq(balanceTransactions.customerId, customers.id))
    .orderBy(desc(balanceTransactions.createdAt))
    .limit(limit);
}

/**
 * Get customer statistics
 */
export async function getCustomerStats() {
  const db = await getDb();
  if (!db) return {
    totalCustomers: 0,
    activeCustomers: 0,
    activeCustomersLast30Days: 0,
    totalBalance: 0,
    averageBalance: 0,
  };

  // Get basic customer stats
  const stats = await db
    .select({
      totalCustomers: sql<number>`CAST(COUNT(*) AS UNSIGNED)`,
      activeCustomers: sql<number>`CAST(SUM(CASE WHEN ${customers.active} = 1 THEN 1 ELSE 0 END) AS UNSIGNED)`,
      totalBalance: sql<number>`CAST(COALESCE(SUM(${customers.balance}), 0) AS UNSIGNED)`,
      averageBalance: sql<number>`CAST(COALESCE(AVG(${customers.balance}), 0) AS UNSIGNED)`,
    })
    .from(customers);

  // Get count of EXISTING customers with at least one activation in the last 30 days
  // Use INNER JOIN to ensure we only count customers that still exist in the customers table
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const activeCustomersResult = await db
    .selectDistinct({ customerId: activations.userId })
    .from(activations)
    .innerJoin(customers, eq(activations.userId, customers.id))
    .where(gte(activations.createdAt, thirtyDaysAgo));

  const activeCustomersLast30Days = activeCustomersResult.length;

  return {
    ...(stats[0] || {
      totalCustomers: 0,
      activeCustomers: 0,
      totalBalance: 0,
      averageBalance: 0,
    }),
    activeCustomersLast30Days,
  };
}
