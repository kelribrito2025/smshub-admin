import { getDb } from "./server/db";
import { stripeTransactions, balanceTransactions, customers } from "./drizzle/schema";
import { eq } from "drizzle-orm";

async function processPendingStripePayment() {
  console.log("🔍 Buscando transação Stripe pendente de R$ 20,00...");
  
  const db = await getDb();
  if (!db) {
    console.error("❌ Erro: Banco de dados não disponível");
    process.exit(1);
  }

  // Buscar transação pendente de R$ 20,00
  const result = await db
    .select()
    .from(stripeTransactions)
    .where(eq(stripeTransactions.amount, 2000))
    .orderBy(stripeTransactions.createdAt)
    .limit(1);

  const transaction = result[0];

  if (!transaction) {
    console.error("❌ Nenhuma transação de R$ 20,00 encontrada");
    process.exit(1);
  }

  console.log(`✅ Transação encontrada: ID ${transaction.id}`);
  console.log(`   Customer ID: ${transaction.customerId}`);
  console.log(`   Status atual: ${transaction.status}`);
  console.log(`   Valor: R$ ${(transaction.amount / 100).toFixed(2)}`);

  if (transaction.status === "completed") {
    console.log("⚠️  Transação já foi processada anteriormente");
    process.exit(0);
  }

  // Buscar cliente
  const customerResult = await db
    .select()
    .from(customers)
    .where(eq(customers.id, transaction.customerId))
    .limit(1);

  const customer = customerResult[0];

  if (!customer) {
    console.error(`❌ Cliente ${transaction.customerId} não encontrado`);
    process.exit(1);
  }

  console.log(`\n👤 Cliente: ${customer.name || customer.email}`);
  console.log(`   Saldo atual: R$ ${(customer.balance / 100).toFixed(2)}`);

  // Atualizar status da transação
  await db
    .update(stripeTransactions)
    .set({
      status: "completed",
      updatedAt: new Date(),
    })
    .where(eq(stripeTransactions.id, transaction.id));

  console.log(`✅ Status da transação atualizado para "completed"`);

  // Creditar saldo do cliente
  const newBalance = customer.balance + transaction.amount;

  await db
    .update(customers)
    .set({
      balance: newBalance,
      updatedAt: new Date(),
    })
    .where(eq(customers.id, customer.id));

  console.log(`✅ Saldo creditado: R$ ${(transaction.amount / 100).toFixed(2)}`);
  console.log(`   Novo saldo: R$ ${(newBalance / 100).toFixed(2)}`);

  // Criar registro de transação de saldo
  await db.insert(balanceTransactions).values({
    customerId: customer.id,
    amount: transaction.amount,
    type: "credit",
    description: `Recarga via Stripe - R$ ${(transaction.amount / 100).toFixed(2)} (processamento manual)`,
    balanceBefore: customer.balance,
    balanceAfter: newBalance,
  });

  console.log(`✅ Registro de transação criado no histórico`);

  console.log(`\n🎉 Pagamento processado com sucesso!`);
  console.log(`   Cliente: ${customer.name || customer.email}`);
  console.log(`   Valor creditado: R$ ${(transaction.amount / 100).toFixed(2)}`);
  console.log(`   Saldo final: R$ ${(newBalance / 100).toFixed(2)}`);

  process.exit(0);
}

processPendingStripePayment().catch((error) => {
  console.error("❌ Erro ao processar pagamento:", error);
  process.exit(1);
});
