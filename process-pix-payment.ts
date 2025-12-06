#!/usr/bin/env tsx

import { EfiPayClient } from './server/efipay-client';
import { getDb } from './server/db';
import { pixTransactions, customers, balanceTransactions } from './drizzle/schema';
import { eq } from 'drizzle-orm';

async function processPixPayment() {
  try {
    console.log('🔍 Buscando transações PIX pendentes...\n');
    
    const db = await getDb();
    if (!db) {
      throw new Error('Database not available');
    }

    // Get pending transactions
    const pending = await db
      .select()
      .from(pixTransactions)
      .where(eq(pixTransactions.status, 'pending'))
      .orderBy(pixTransactions.createdAt);

    console.log(`📋 Encontradas ${pending.length} transações pendentes\n`);

    if (pending.length === 0) {
      console.log('✅ Nenhuma transação pendente para processar');
      return;
    }

    const client = new EfiPayClient();

    for (const transaction of pending) {
      console.log(`\n🔎 Verificando transação ${transaction.txid}...`);
      console.log(`   Cliente: ${transaction.customerId}`);
      console.log(`   Valor: R$ ${(transaction.amount / 100).toFixed(2)}`);
      console.log(`   Criada em: ${transaction.createdAt}`);

      try {
        // Check payment status on EfiPay
        const charge = await client.getCharge(transaction.txid);
        
        console.log(`   Status na EfiPay: ${charge.status}`);

        // Check if payment was received
        if (charge.status === 'CONCLUIDA' && charge.pix && charge.pix.length > 0) {
          const pixData = charge.pix[0];
          const paidAt = new Date(pixData.horario);

          console.log(`   ✅ Pagamento confirmado!`);
          console.log(`   Pago em: ${paidAt}`);
          console.log(`   Valor pago: R$ ${pixData.valor}`);

          // Update transaction status
          await db
            .update(pixTransactions)
            .set({
              status: 'paid',
              paidAt,
              updatedAt: new Date(),
            })
            .where(eq(pixTransactions.id, transaction.id));

          console.log(`   💾 Status atualizado para 'paid'`);

          // Get customer current balance
          const customerResult = await db
            .select()
            .from(customers)
            .where(eq(customers.id, transaction.customerId))
            .limit(1);

          const customer = customerResult[0];

          if (!customer) {
            console.error(`   ❌ Cliente ${transaction.customerId} não encontrado`);
            continue;
          }

          const balanceBefore = customer.balance;
          const balanceAfter = balanceBefore + transaction.amount;

          // Add balance to customer
          await db
            .update(customers)
            .set({
              balance: balanceAfter,
              updatedAt: new Date(),
            })
            .where(eq(customers.id, transaction.customerId));

          console.log(`   💰 Saldo atualizado:`);
          console.log(`      Antes: R$ ${(balanceBefore / 100).toFixed(2)}`);
          console.log(`      Depois: R$ ${(balanceAfter / 100).toFixed(2)}`);

          // Create balance transaction record
          await db.insert(balanceTransactions).values({
            customerId: transaction.customerId,
            amount: transaction.amount,
            type: 'credit',
            description: `Recarga via PIX - ${transaction.txid}`,
            balanceBefore,
            balanceAfter,
            createdAt: new Date(),
          });

          console.log(`   📝 Transação de saldo registrada`);
          console.log(`   ✅ Processamento completo!`);

        } else {
          console.log(`   ⏳ Pagamento ainda não confirmado (status: ${charge.status})`);
        }

      } catch (error: any) {
        console.error(`   ❌ Erro ao verificar transação:`, error.message);
      }
    }

    console.log('\n✅ Processamento finalizado!');

  } catch (error: any) {
    console.error('❌ Erro:', error.message);
    console.error(error);
  }
}

processPixPayment();
