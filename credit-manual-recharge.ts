#!/usr/bin/env tsx

/**
 * Script para creditar recarga PIX manualmente
 * Usado quando o webhook não foi recebido
 */

import { getDb } from './server/db';
import { customers, pixTransactions, balanceTransactions, recharges } from './drizzle/schema';
import { eq, and } from 'drizzle-orm';

async function creditManualRecharge() {
  console.log('🔧 Creditando recarga PIX manualmente...\n');
  
  const db = await getDb();
  if (!db) {
    console.error('❌ Database not available');
    process.exit(1);
  }

  const customerEmail = 'xkelrix@gmail.com';
  const amount = 212; // R$ 2,12 em centavos
  
  try {
    // 1. Find customer
    const [customer] = await db.select().from(customers).where(eq(customers.email, customerEmail));
    
    if (!customer) {
      console.error(`❌ Cliente não encontrado: ${customerEmail}`);
      process.exit(1);
    }
    
    console.log(`✅ Cliente encontrado: ID ${customer.id}, Saldo atual: R$ ${(customer.balance / 100).toFixed(2)}`);
    
    // 2. Find PIX transaction
    const [transaction] = await db
      .select()
      .from(pixTransactions)
      .where(and(
        eq(pixTransactions.customerId, customer.id),
        eq(pixTransactions.amount, amount)
      ))
      .orderBy(pixTransactions.createdAt)
      .limit(1);
    
    if (!transaction) {
      console.error(`❌ Transação PIX não encontrada para o valor R$ ${(amount / 100).toFixed(2)}`);
      process.exit(1);
    }
    
    console.log(`✅ Transação encontrada: ${transaction.txid}, Status: ${transaction.status}`);
    
    if (transaction.status === 'paid') {
      console.log('⚠️  Transação já foi paga anteriormente');
      process.exit(0);
    }
    
    // 3. Update transaction status
    const now = new Date();
    await db
      .update(pixTransactions)
      .set({
        status: 'paid',
        paidAt: now,
        updatedAt: now,
      })
      .where(eq(pixTransactions.id, transaction.id));
    
    console.log('✅ Status da transação atualizado para "paid"');
    
    // 4. Update customer balance
    const newBalance = customer.balance + amount;
    await db
      .update(customers)
      .set({
        balance: newBalance,
        updatedAt: now,
      })
      .where(eq(customers.id, customer.id));
    
    console.log(`✅ Saldo atualizado: R$ ${(customer.balance / 100).toFixed(2)} → R$ ${(newBalance / 100).toFixed(2)}`);
    
    // 5. Create balance transaction record
    await db.insert(balanceTransactions).values({
      customerId: customer.id,
      type: 'credit',
      amount,
      description: `Recarga PIX - ${transaction.txid}`,
      balanceBefore: customer.balance,
      balanceAfter: newBalance,
      createdAt: now,
    });
    
    console.log('✅ Registro criado em balance_transactions');
    
    // 6. Create recharge record
    await db.insert(recharges).values({
      customerId: customer.id,
      amount,
      paymentMethod: 'pix',
      status: 'completed',
      transactionId: transaction.txid,
      completedAt: now,
      createdAt: now,
      updatedAt: now,
    });
    
    console.log('✅ Registro criado em recharges (histórico)');
    
    console.log('\n🎉 Recarga creditada com sucesso!');
    console.log(`\n📊 Resumo:`);
    console.log(`   Cliente: ${customer.email}`);
    console.log(`   Valor: R$ ${(amount / 100).toFixed(2)}`);
    console.log(`   Novo saldo: R$ ${(newBalance / 100).toFixed(2)}`);
    
  } catch (error: any) {
    console.error('❌ Erro ao creditar recarga:');
    console.error(error.message);
    process.exit(1);
  }
}

creditManualRecharge();
