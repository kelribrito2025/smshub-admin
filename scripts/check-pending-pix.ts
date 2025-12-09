#!/usr/bin/env tsx

/**
 * Script para verificar transações PIX pendentes
 */

import { getDb } from '../server/db';
import { pixTransactions } from '../drizzle/schema';
import { eq } from 'drizzle-orm';

async function checkPendingTransactions() {
  console.log('🔍 Verificando transações PIX pendentes...\n');
  
  try {
    const db = await getDb();
    const pending = await db.select().from(pixTransactions).where(eq(pixTransactions.status, 'pending'));
    
    console.log(`📊 Transações PIX Pendentes: ${pending.length}`);
    
    if (pending.length > 0) {
      console.log('\n📋 Detalhes:');
      pending.forEach((t, i) => {
        console.log(`\n${i+1}. ID: ${t.id}`);
        console.log(`   Cliente: ${t.customerId}`);
        console.log(`   Valor: R$ ${(t.amount / 100).toFixed(2)}`);
        console.log(`   TxID: ${t.txid}`);
        console.log(`   Criado: ${t.createdAt}`);
      });
    } else {
      console.log('\n✅ Nenhuma transação pendente encontrada!');
    }
    
  } catch (error: any) {
    console.error('❌ Erro ao verificar transações:');
    console.error(error.message);
    process.exit(1);
  }
}

checkPendingTransactions();
