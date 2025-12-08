import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import { pixTransactions, customers, balanceTransactions, recharges } from '../drizzle/schema.js';
import { eq } from 'drizzle-orm';

const connection = await mysql.createConnection(process.env.DATABASE_URL);
const db = drizzle(connection);

// Buscar transação PIX de R$ 1,20
const [transaction] = await db
  .select()
  .from(pixTransactions)
  .where(eq(pixTransactions.customerId, 480001))
  .where(eq(pixTransactions.amount, 120))
  .orderBy(pixTransactions.createdAt, 'desc')
  .limit(1);

if (!transaction) {
  console.error('❌ Transação não encontrada');
  process.exit(1);
}

console.log('✅ Transação encontrada:', transaction.txid);

// Buscar cliente
const [customer] = await db
  .select()
  .from(customers)
  .where(eq(customers.id, 480001))
  .limit(1);

if (!customer) {
  console.error('❌ Cliente não encontrado');
  process.exit(1);
}

const balanceBefore = customer.balance;
const balanceAfter = balanceBefore + 120;

console.log(`💰 Saldo antes: R$ ${(balanceBefore / 100).toFixed(2)}`);
console.log(`💰 Saldo depois: R$ ${(balanceAfter / 100).toFixed(2)}`);

// Atualizar saldo do cliente
await db
  .update(customers)
  .set({ balance: balanceAfter })
  .where(eq(customers.id, 480001));

console.log('✅ Saldo atualizado');

// Criar registro em balance_transactions
await db.insert(balanceTransactions).values({
  customerId: 480001,
  amount: 120,
  type: 'credit',
  origin: 'system',
  description: `Recarga via PIX - ${transaction.txid}`,
  balanceBefore,
  balanceAfter,
  createdAt: new Date(),
});

console.log('✅ Registro em balance_transactions criado');

// Criar registro em recharges
await db.insert(recharges).values({
  customerId: 480001,
  amount: 120,
  paymentMethod: 'pix',
  status: 'completed',
  transactionId: transaction.txid,
  completedAt: new Date(),
  createdAt: new Date(),
});

console.log('✅ Registro em recharges criado');

// Atualizar status da transação PIX
await db
  .update(pixTransactions)
  .set({ status: 'paid', paidAt: new Date() })
  .where(eq(pixTransactions.id, transaction.id));

console.log('✅ Status da transação PIX atualizado para "paid"');

console.log('\n🎉 Crédito manual concluído com sucesso!');

await connection.end();
