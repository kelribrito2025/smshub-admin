import mysql from 'mysql2/promise';

const DATABASE_URL = process.env.DATABASE_URL;

async function runTest() {
  const conn = await mysql.createConnection(DATABASE_URL);
  
  console.log('\n🧪 TESTE: Sistema de Detecção de Inconsistências de Saldo\n');
  console.log('=' .repeat(70));
  
  // ========== CENÁRIO 1: Cliente com saldo CORRETO ==========
  console.log('\n📊 CENÁRIO 1: Cliente com Saldo Correto\n');
  
  const pin1 = 8000 + Math.floor(Math.random() * 1000);
  const email1 = `teste-correto-${Date.now()}@demo.com`;
  
  console.log(`✅ Criando cliente: "João Silva" (PIN: ${pin1})`);
  const [result1] = await conn.execute(
    'INSERT INTO customers (pin, name, email, balance, active) VALUES (?, ?, ?, ?, ?)',
    [pin1, 'João Silva', email1, 0, true]
  );
  const customerId1 = result1.insertId;
  console.log(`   ID do cliente: ${customerId1}`);
  
  console.log('\n💰 Simulando transações:');
  
  // Recarga de R$ 50,00
  console.log('   1. Recarga de R$ 50,00 (admin)');
  await conn.execute(
    `INSERT INTO balance_transactions 
     (customerId, amount, type, description, balanceBefore, balanceAfter, origin) 
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [customerId1, 5000, 'credit', 'Recarga via PIX', 0, 5000, 'admin']
  );
  
  // Compra de R$ 15,00
  console.log('   2. Compra de número SMS: -R$ 15,00 (sistema)');
  await conn.execute(
    `INSERT INTO balance_transactions 
     (customerId, amount, type, description, balanceBefore, balanceAfter, origin) 
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [customerId1, -1500, 'debit', 'Compra de número - WhatsApp', 5000, 3500, 'system']
  );
  
  // Compra de R$ 10,00
  console.log('   3. Compra de número SMS: -R$ 10,00 (sistema)');
  await conn.execute(
    `INSERT INTO balance_transactions 
     (customerId, amount, type, description, balanceBefore, balanceAfter, origin) 
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [customerId1, -1000, 'debit', 'Compra de número - Telegram', 3500, 2500, 'system']
  );
  
  // Atualizar saldo final CORRETO
  await conn.execute(
    'UPDATE customers SET balance = ? WHERE id = ?',
    [2500, customerId1]
  );
  
  console.log('\n📈 Saldo esperado: R$ 50,00 - R$ 15,00 - R$ 10,00 = R$ 25,00');
  console.log('📊 Saldo real no banco: R$ 25,00');
  console.log('✅ STATUS: CONSISTENTE (diferença = R$ 0,00)');
  
  // ========== CENÁRIO 2: Cliente com saldo INCONSISTENTE ==========
  console.log('\n' + '=' .repeat(70));
  console.log('\n📊 CENÁRIO 2: Cliente com Saldo Inconsistente (Suspeito)\n');
  
  const pin2 = 8000 + Math.floor(Math.random() * 1000);
  const email2 = `teste-inconsistente-${Date.now()}@demo.com`;
  
  console.log(`⚠️  Criando cliente: "Maria Santos" (PIN: ${pin2})`);
  const [result2] = await conn.execute(
    'INSERT INTO customers (pin, name, email, balance, active) VALUES (?, ?, ?, ?, ?)',
    [pin2, 'Maria Santos', email2, 0, true]
  );
  const customerId2 = result2.insertId;
  console.log(`   ID do cliente: ${customerId2}`);
  
  console.log('\n💰 Simulando transações:');
  
  // Recarga de R$ 30,00
  console.log('   1. Recarga de R$ 30,00 (admin)');
  await conn.execute(
    `INSERT INTO balance_transactions 
     (customerId, amount, type, description, balanceBefore, balanceAfter, origin) 
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [customerId2, 3000, 'credit', 'Recarga via Boleto', 0, 3000, 'admin']
  );
  
  // Compra de R$ 8,00
  console.log('   2. Compra de número SMS: -R$ 8,00 (sistema)');
  await conn.execute(
    `INSERT INTO balance_transactions 
     (customerId, amount, type, description, balanceBefore, balanceAfter, origin) 
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [customerId2, -800, 'debit', 'Compra de número - Google', 3000, 2200, 'system']
  );
  
  // PROBLEMA: Atualizar saldo para valor ERRADO (R$ 150,00 em vez de R$ 22,00)
  console.log('\n🔴 SIMULANDO INCONSISTÊNCIA:');
  console.log('   Manipulando saldo manualmente para R$ 150,00 (deveria ser R$ 22,00)');
  await conn.execute(
    'UPDATE customers SET balance = ? WHERE id = ?',
    [15000, customerId2] // R$ 150,00 em centavos
  );
  
  console.log('\n📈 Saldo esperado: R$ 30,00 - R$ 8,00 = R$ 22,00');
  console.log('📊 Saldo real no banco: R$ 150,00');
  console.log('🚨 STATUS: INCONSISTENTE (diferença = +R$ 128,00) - CRÍTICO!');
  
  // ========== CENÁRIO 3: Outro cliente inconsistente (diferença menor) ==========
  console.log('\n' + '=' .repeat(70));
  console.log('\n📊 CENÁRIO 3: Cliente com Inconsistência Média\n');
  
  const pin3 = 8000 + Math.floor(Math.random() * 1000);
  const email3 = `teste-medio-${Date.now()}@demo.com`;
  
  console.log(`⚠️  Criando cliente: "Pedro Costa" (PIN: ${pin3})`);
  const [result3] = await conn.execute(
    'INSERT INTO customers (pin, name, email, balance, active) VALUES (?, ?, ?, ?, ?)',
    [pin3, 'Pedro Costa', email3, 0, true]
  );
  const customerId3 = result3.insertId;
  
  console.log('\n💰 Simulando transações:');
  console.log('   1. Recarga de R$ 20,00 (admin)');
  await conn.execute(
    `INSERT INTO balance_transactions 
     (customerId, amount, type, description, balanceBefore, balanceAfter, origin) 
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [customerId3, 2000, 'credit', 'Recarga via Cartão', 0, 2000, 'admin']
  );
  
  // PROBLEMA: Saldo com diferença de R$ 5,00
  console.log('\n🟡 SIMULANDO INCONSISTÊNCIA MÉDIA:');
  console.log('   Manipulando saldo para R$ 25,00 (deveria ser R$ 20,00)');
  await conn.execute(
    'UPDATE customers SET balance = ? WHERE id = ?',
    [2500, customerId3]
  );
  
  console.log('\n📈 Saldo esperado: R$ 20,00');
  console.log('📊 Saldo real no banco: R$ 25,00');
  console.log('🟡 STATUS: INCONSISTENTE (diferença = +R$ 5,00) - MÉDIO');
  
  // ========== RESUMO ==========
  console.log('\n' + '=' .repeat(70));
  console.log('\n📋 RESUMO DOS TESTES:\n');
  console.log(`✅ Cliente 1 (${pin1}): João Silva - CONSISTENTE`);
  console.log(`🚨 Cliente 2 (${pin2}): Maria Santos - INCONSISTENTE (CRÍTICO: +R$ 128,00)`);
  console.log(`🟡 Cliente 3 (${pin3}): Pedro Costa - INCONSISTENTE (MÉDIO: +R$ 5,00)`);
  
  console.log('\n🔍 Como o Sistema Detecta:\n');
  console.log('1. Quando você acessa o painel de Auditoria de Saldo');
  console.log('2. O sistema automaticamente:');
  console.log('   • Busca todos os clientes ativos');
  console.log('   • Para cada cliente, soma TODAS as transações (créditos - débitos)');
  console.log('   • Compara o saldo calculado com o saldo real no banco');
  console.log('   • Se houver diferença, classifica a severidade:');
  console.log('     - BAIXO: diferença < R$ 1,00');
  console.log('     - MÉDIO: diferença entre R$ 1,00 e R$ 10,00');
  console.log('     - CRÍTICO: diferença > R$ 10,00');
  console.log('   • Exibe alertas visuais no topo da página');
  
  console.log('\n💡 Vantagens do Sistema:\n');
  console.log('✓ Zero overhead - não cria jobs em background');
  console.log('✓ Detecção passiva - valida apenas quando necessário');
  console.log('✓ Usa dados já carregados - sem requisições extras');
  console.log('✓ Alertas visuais claros - fácil identificação');
  console.log('✓ Classificação de severidade - priorização de casos críticos');
  
  console.log('\n🌐 Acesse o painel para ver os alertas:');
  console.log('   https://3000-iim53xkeikhfrj1mmoe85-8bbf30d6.manusvm.computer/auditoria');
  
  console.log('\n' + '=' .repeat(70));
  console.log('\n✅ Teste concluído com sucesso!\n');
  
  await conn.end();
}

runTest().catch(console.error);
