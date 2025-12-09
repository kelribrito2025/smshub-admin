#!/usr/bin/env tsx

/**
 * Script para creditar transações PIX pendentes manualmente
 * 
 * Este script:
 * 1. Busca todas as transações PIX com status 'pending'
 * 2. Para cada transação:
 *    - Credita saldo do cliente
 *    - Cria registro em recharges
 *    - Cria registro em balance_transactions
 *    - Atualiza status da transação para 'completed'
 *    - Processa bônus de primeira recarga (se aplicável)
 * 3. Exibe resumo final
 */

import { getDb } from '../server/db';
import { pixTransactions, customers, recharges, balanceTransactions } from '../drizzle/schema';
import { eq } from 'drizzle-orm';
import { processFirstRechargeBonus } from '../server/db-helpers/affiliate-helpers';

async function creditPendingTransactions() {
  console.log('🔄 Iniciando crédito de transações PIX pendentes...\n');
  
  try {
    const db = await getDb();
    
    // Buscar todas as transações pendentes
    const pending = await db.select().from(pixTransactions).where(eq(pixTransactions.status, 'pending'));
    
    if (pending.length === 0) {
      console.log('✅ Nenhuma transação pendente encontrada!');
      return;
    }
    
    console.log(`📊 Encontradas ${pending.length} transações pendentes\n`);
    console.log('='.repeat(80));
    
    let totalCredited = 0;
    let successCount = 0;
    let errorCount = 0;
    
    for (const transaction of pending) {
      try {
        console.log(`\n🔄 Processando transação ID ${transaction.id}...`);
        console.log(`   Cliente: ${transaction.customerId}`);
        console.log(`   Valor: R$ ${(transaction.amount / 100).toFixed(2)}`);
        console.log(`   TxID: ${transaction.txid}`);
        
        // Buscar cliente
        const [customer] = await db.select().from(customers).where(eq(customers.id, transaction.customerId));
        
        if (!customer) {
          console.error(`   ❌ Cliente não encontrado: ${transaction.customerId}`);
          errorCount++;
          continue;
        }
        
        const oldBalance = customer.balance;
        const newBalance = oldBalance + transaction.amount;
        
        // Atualizar saldo do cliente
        await db.update(customers)
          .set({ balance: newBalance })
          .where(eq(customers.id, transaction.customerId));
        
        console.log(`   💰 Saldo atualizado: R$ ${(oldBalance / 100).toFixed(2)} → R$ ${(newBalance / 100).toFixed(2)}`);
        
        // Criar registro em recharges
        await db.insert(recharges).values({
          customerId: transaction.customerId,
          amount: transaction.amount,
          method: 'pix',
          status: 'completed',
          pixTransactionId: transaction.id,
          createdAt: transaction.createdAt,
          updatedAt: new Date(),
        });
        
        console.log(`   📝 Registro criado em recharges`);
        
        // Criar registro em balance_transactions
        await db.insert(balanceTransactions).values({
          customerId: transaction.customerId,
          amount: transaction.amount,
          type: 'credit',
          description: `Recarga PIX - TxID: ${transaction.txid}`,
          metadata: JSON.stringify({
            pixTransactionId: transaction.id,
            txid: transaction.txid,
            creditedManually: true,
            creditedAt: new Date().toISOString(),
          }),
          createdAt: transaction.createdAt,
        });
        
        console.log(`   📝 Registro criado em balance_transactions`);
        
        // Atualizar status da transação para 'completed'
        await db.update(pixTransactions)
          .set({ 
            status: 'completed',
            updatedAt: new Date(),
          })
          .where(eq(pixTransactions.id, transaction.id));
        
        console.log(`   ✅ Status atualizado para 'completed'`);
        
        // Processar bônus de primeira recarga (se aplicável)
        try {
          await processFirstRechargeBonus(transaction.customerId, transaction.amount);
          console.log(`   🎁 Bônus de primeira recarga processado (se aplicável)`);
        } catch (bonusError) {
          console.log(`   ⚠️  Erro ao processar bônus (não crítico): ${bonusError.message}`);
        }
        
        totalCredited += transaction.amount;
        successCount++;
        
        console.log(`   ✅ Transação creditada com sucesso!`);
        
      } catch (error: any) {
        console.error(`   ❌ Erro ao processar transação ${transaction.id}:`, error.message);
        errorCount++;
      }
    }
    
    // Resumo final
    console.log('\n' + '='.repeat(80));
    console.log('\n📊 RESUMO FINAL\n');
    console.log(`✅ Transações creditadas: ${successCount}`);
    console.log(`❌ Erros: ${errorCount}`);
    console.log(`💰 Total creditado: R$ ${(totalCredited / 100).toFixed(2)}`);
    console.log('\n' + '='.repeat(80));
    
    if (successCount > 0) {
      console.log('\n✅ Crédito manual concluído com sucesso!');
      console.log('\n💡 Próximos passos:');
      console.log('   1. Validar saldos dos clientes no painel admin');
      console.log('   2. Verificar registros em /store/recharges');
      console.log('   3. Investigar por que webhooks não estão chegando');
      console.log('   4. Configurar logs detalhados para debug');
    }
    
  } catch (error: any) {
    console.error('\n❌ Erro fatal ao creditar transações:');
    console.error(error.message);
    process.exit(1);
  }
}

// Executar script
creditPendingTransactions();
