#!/usr/bin/env node
import mysql from 'mysql2/promise';
import 'dotenv/config';

const connection = await mysql.createConnection(process.env.DATABASE_URL);

console.log('🔍 Buscando transações PIX pendentes...\n');

const [transactions] = await connection.query(`
  SELECT 
    pt.*,
    c.email,
    c.balance as saldo_atual
  FROM pix_transactions pt
  JOIN customers c ON pt.customerId = c.id
  WHERE c.email = 'xkelrix@gmail.com'
    AND pt.status = 'pending'
  ORDER BY pt.createdAt DESC
`);

if (transactions.length === 0) {
  console.log('✅ Nenhuma transação pendente encontrada!');
  await connection.end();
  process.exit(0);
}

console.log(`📋 Encontradas ${transactions.length} transações pendentes:\n`);

for (const tx of transactions) {
  console.log(`  ID: ${tx.id}`);
  console.log(`  TXID: ${tx.txid}`);
  console.log(`  Valor: R$ ${(tx.amount / 100).toFixed(2)}`);
  console.log(`  Cliente: ${tx.email}`);
  console.log(`  Saldo atual: R$ ${(tx.saldo_atual / 100).toFixed(2)}`);
  console.log('');
}

console.log('💰 Processando transações...\n');

for (const tx of transactions) {
  // 1. Atualizar status da transação PIX
  await connection.query(`
    UPDATE pix_transactions 
    SET status = 'paid', 
        paidAt = NOW(), 
        updatedAt = NOW()
    WHERE id = ?
  `, [tx.id]);
  
  console.log(`✅ Transação ${tx.txid} marcada como paga`);
  
  // 2. Creditar saldo do cliente
  await connection.query(`
    UPDATE customers 
    SET balance = balance + ?,
        updatedAt = NOW()
    WHERE id = ?
  `, [tx.amount, tx.customerId]);
  
  console.log(`✅ Saldo creditado: R$ ${(tx.amount / 100).toFixed(2)}`);
  
  // 3. Criar registro de recarga (sem campo method)
  await connection.query(`
    INSERT INTO recharges (customerId, amount, status, createdAt, updatedAt)
    VALUES (?, ?, 'confirmed', NOW(), NOW())
  `, [tx.customerId, tx.amount]);
  
  console.log(`✅ Registro de recarga criado`);
  
  // 4. Criar transação de saldo
  await connection.query(`
    INSERT INTO balance_transactions (customerId, amount, type, description, createdAt)
    VALUES (?, ?, 'credit', ?, NOW())
  `, [tx.customerId, tx.amount, `Recarga PIX - ${tx.txid}`]);
  
  console.log(`✅ Transação de saldo registrada\n`);
}

// Verificar saldo final
const [finalBalance] = await connection.query(`
  SELECT email, balance 
  FROM customers 
  WHERE email = 'xkelrix@gmail.com'
`);

const customer = finalBalance[0];
console.log('🎉 Processamento concluído!\n');
console.log(`Saldo final de ${customer.email}: R$ ${(customer.balance / 100).toFixed(2)}\n`);

await connection.end();
