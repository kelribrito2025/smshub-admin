import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import { recharges, customers } from './drizzle/schema.ts';
import { eq, and, desc, sql } from 'drizzle-orm';

const DATABASE_URL = process.env.DATABASE_URL;

async function testRechargesQuery() {
  const connection = await mysql.createConnection(DATABASE_URL);
  const db = drizzle(connection, { mode: 'default' });

  // Buscar cliente xkelrix@gmail.com
  const customerResult = await db
    .select()
    .from(customers)
    .where(eq(customers.email, 'xkelrix@gmail.com'))
    .limit(1);

  const customer = customerResult[0];
  console.log('Cliente encontrado:', {
    id: customer.id,
    email: customer.email,
    pin: customer.pin,
    balance: customer.balance
  });

  const customerId = customer.id;
  const page = 1;
  const limit = 20;

  // Construir condições de filtro (mesma lógica do backend)
  const conditions = [eq(recharges.customerId, customerId)];

  // Buscar total de registros
  const totalResult = await db
    .select({ count: sql`count(*)` })
    .from(recharges)
    .where(and(...conditions));

  const total = Number(totalResult[0]?.count || 0);
  console.log('\nTotal de recargas no banco:', total);

  // Calcular paginação
  const totalPages = Math.ceil(total / limit);
  const offset = (page - 1) * limit;

  // Buscar recargas com paginação
  const results = await db
    .select()
    .from(recharges)
    .where(and(...conditions))
    .orderBy(desc(recharges.createdAt))
    .limit(limit)
    .offset(offset);

  console.log('\nRecargas retornadas pela query:', results.length);
  console.log('\nDetalhes das recargas:');
  results.forEach((r, index) => {
    console.log(`${index + 1}. ID: ${r.id}, Valor: R$ ${(r.amount / 100).toFixed(2)}, Método: ${r.paymentMethod}, Status: ${r.status}, Data: ${r.createdAt}`);
  });

  await connection.end();
}

testRechargesQuery().catch(console.error);
