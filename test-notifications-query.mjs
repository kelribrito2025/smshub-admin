import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import { notifications, notificationReads } from './drizzle/schema.ts';
import { eq, desc, and, or, isNull } from 'drizzle-orm';

const connection = await mysql.createConnection(process.env.DATABASE_URL);
const db = drizzle(connection, { mode: 'default' });

// Simular o ID do customer (510001 baseado nos logs)
const customerId = 510001;

console.log('=== Testing notification query for customer', customerId, '===\n');

// Executar a mesma query que o backend usa
const customerNotifications = await db
  .select({
    id: notifications.id,
    customerId: notifications.customerId,
    type: notifications.type,
    title: notifications.title,
    message: notifications.message,
    data: notifications.data,
    createdAt: notifications.createdAt,
    readAt: notificationReads.readAt,
  })
  .from(notifications)
  .leftJoin(
    notificationReads,
    and(
      eq(notificationReads.notificationId, notifications.id),
      eq(notificationReads.customerId, customerId)
    )
  )
  .where(
    or(
      eq(notifications.customerId, customerId),
      isNull(notifications.customerId) // Global notifications
    )
  )
  .orderBy(desc(notifications.createdAt))
  .limit(50);

console.log('Total notifications found:', customerNotifications.length);
console.log('\nNotifications:\n');

customerNotifications.forEach((notif, index) => {
  console.log(`${index + 1}. [${notif.type}] ${notif.title}`);
  console.log(`   Customer ID: ${notif.customerId || 'GLOBAL'}`);
  console.log(`   Message: ${notif.message}`);
  console.log(`   Created: ${notif.createdAt}`);
  console.log(`   Read: ${notif.readAt ? 'YES' : 'NO'}`);
  console.log('');
});

await connection.end();
