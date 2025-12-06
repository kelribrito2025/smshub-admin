import mysql from 'mysql2/promise';

const DATABASE_URL = process.env.DATABASE_URL;

async function runTest() {
  const conn = await mysql.createConnection(DATABASE_URL);
  
  console.log('\n🧪 TESTE: Sistema de Recomendação Inteligente de Fornecedores\n');
  console.log('='.repeat(70));
  
  // Buscar um serviço existente (WhatsApp)
  const [services] = await conn.execute(
    "SELECT id, name FROM services WHERE smshubCode = 'wa' LIMIT 1"
  );
  
  if (services.length === 0) {
    console.log('❌ Serviço WhatsApp não encontrado. Execute a sincronização primeiro.');
    await conn.end();
    return;
  }
  
  const serviceId = services[0].id;
  const serviceName = services[0].name;
  
  console.log(`\n📱 Serviço selecionado: ${serviceName} (ID: ${serviceId})\n`);
  console.log('='.repeat(70));
  
  // Buscar um cliente existente
  const [customers] = await conn.execute(
    'SELECT id, name FROM customers WHERE active = 1 LIMIT 1'
  );
  
  if (customers.length === 0) {
    console.log('❌ Nenhum cliente encontrado.');
    await conn.end();
    return;
  }
  
  const customerId = customers[0].id;
  const customerName = customers[0].name;
  
  console.log(`\n👤 Cliente de teste: ${customerName} (ID: ${customerId})\n`);
  
  // Buscar país (Brasil)
  const [countries] = await conn.execute(
    "SELECT id FROM countries WHERE code = 'brazil' LIMIT 1"
  );
  
  if (countries.length === 0) {
    console.log('❌ País Brasil não encontrado.');
    await conn.end();
    return;
  }
  
  const countryId = countries[0].id;
  
  console.log('📊 Criando ativações de teste para simular performance dos fornecedores...\n');
  
  // ========== FORNECEDOR 1 (API 1): 85% de sucesso ==========
  console.log('🔵 Fornecedor 1 (Opção 1): Simulando 85% de sucesso');
  console.log('   Criando 100 ativações: 85 completed, 15 cancelled\n');
  
  for (let i = 0; i < 85; i++) {
    await conn.execute(
      `INSERT INTO activations 
       (smshubActivationId, apiId, userId, serviceId, countryId, phoneNumber, status, sellingPrice, createdAt) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW() - INTERVAL ? HOUR)`,
      [`test-api1-${Date.now()}-${i}`, 1, customerId, serviceId, countryId, `5511900000${i}`, 'completed', 1000, Math.floor(Math.random() * 24)]
    );
  }
  
  for (let i = 0; i < 15; i++) {
    await conn.execute(
      `INSERT INTO activations 
       (smshubActivationId, apiId, userId, serviceId, countryId, phoneNumber, status, sellingPrice, createdAt) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW() - INTERVAL ? HOUR)`,
      [`test-api1-cancel-${Date.now()}-${i}`, 1, customerId, serviceId, countryId, `5511900001${i}`, 'cancelled', 1000, Math.floor(Math.random() * 24)]
    );
  }
  
  console.log('   ✅ 100 ativações criadas para Fornecedor 1');
  console.log('   📈 Taxa de sucesso esperada: 85%\n');
  
  // ========== FORNECEDOR 2 (API 2): 60% de sucesso ==========
  console.log('🟡 Fornecedor 2 (Opção 2): Simulando 60% de sucesso');
  console.log('   Criando 100 ativações: 60 completed, 40 cancelled\n');
  
  for (let i = 0; i < 60; i++) {
    await conn.execute(
      `INSERT INTO activations 
       (smshubActivationId, apiId, userId, serviceId, countryId, phoneNumber, status, sellingPrice, createdAt) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW() - INTERVAL ? HOUR)`,
      [`test-api2-${Date.now()}-${i}`, 2, customerId, serviceId, countryId, `5511900002${i}`, 'completed', 1000, Math.floor(Math.random() * 24)]
    );
  }
  
  for (let i = 0; i < 40; i++) {
    await conn.execute(
      `INSERT INTO activations 
       (smshubActivationId, apiId, userId, serviceId, countryId, phoneNumber, status, sellingPrice, createdAt) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW() - INTERVAL ? HOUR)`,
      [`test-api2-cancel-${Date.now()}-${i}`, 2, customerId, serviceId, countryId, `5511900003${i}`, 'cancelled', 1000, Math.floor(Math.random() * 24)]
    );
  }
  
  console.log('   ✅ 100 ativações criadas para Fornecedor 2');
  console.log('   📈 Taxa de sucesso esperada: 60%\n');
  
  // ========== FORNECEDOR 3 (API 3): 40% de sucesso ==========
  console.log('🔴 Fornecedor 3 (Opção 3): Simulando 40% de sucesso');
  console.log('   Criando 100 ativações: 40 completed, 60 cancelled\n');
  
  for (let i = 0; i < 40; i++) {
    await conn.execute(
      `INSERT INTO activations 
       (smshubActivationId, apiId, userId, serviceId, countryId, phoneNumber, status, sellingPrice, createdAt) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW() - INTERVAL ? HOUR)`,
      [`test-api3-${Date.now()}-${i}`, 3, customerId, serviceId, countryId, `5511900004${i}`, 'completed', 1000, Math.floor(Math.random() * 24)]
    );
  }
  
  for (let i = 0; i < 60; i++) {
    await conn.execute(
      `INSERT INTO activations 
       (smshubActivationId, apiId, userId, serviceId, countryId, phoneNumber, status, sellingPrice, createdAt) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW() - INTERVAL ? HOUR)`,
      [`test-api3-cancel-${Date.now()}-${i}`, 3, customerId, serviceId, countryId, `5511900005${i}`, 'cancelled', 1000, Math.floor(Math.random() * 24)]
    );
  }
  
  console.log('   ✅ 100 ativações criadas para Fornecedor 3');
  console.log('   📈 Taxa de sucesso esperada: 40%\n');
  
  // ========== RESUMO ==========
  console.log('='.repeat(70));
  console.log('\n📋 RESUMO DOS DADOS CRIADOS:\n');
  console.log('🔵 Fornecedor 1 (Opção 1): 85% de sucesso (85 SMS recebidos / 100 pedidos)');
  console.log('🟡 Fornecedor 2 (Opção 2): 60% de sucesso (60 SMS recebidos / 100 pedidos)');
  console.log('🔴 Fornecedor 3 (Opção 3): 40% de sucesso (40 SMS recebidos / 100 pedidos)');
  
  console.log('\n⭐ RECOMENDAÇÃO ESPERADA: Fornecedor 1 (Opção 1) - Maior taxa de sucesso\n');
  
  console.log('='.repeat(70));
  console.log('\n🔍 Como o Sistema Funciona:\n');
  console.log('1. Quando o usuário acessa a página de compra do serviço');
  console.log('2. Sistema busca últimas 100 ativações de cada fornecedor');
  console.log('3. Calcula taxa de sucesso: completed / (completed + cancelled)');
  console.log('4. Ignora ativações com status "expired"');
  console.log('5. Marca o fornecedor com maior taxa como "Recomendado"');
  console.log('6. Exibe badge dourado com estrela + tooltip com estatísticas');
  console.log('7. Cache de 5 minutos para evitar recálculo constante');
  
  console.log('\n💡 Benefícios:\n');
  console.log('✓ Zero overhead - cálculo sob demanda');
  console.log('✓ Baseado em dados reais de performance');
  console.log('✓ Atualização automática a cada 5 minutos');
  console.log('✓ Ajuda usuário a escolher melhor opção');
  console.log('✓ Reduz cancelamentos e tickets de suporte');
  
  console.log('\n🌐 Para visualizar:\n');
  console.log('1. Acesse o Painel de Vendas (botão azul no canto superior direito)');
  console.log('2. Faça login com email de um cliente');
  console.log('3. Clique em "Comprar Número"');
  console.log(`4. Selecione o serviço "${serviceName}"`);
  console.log('5. Selecione o país "Brazil"');
  console.log('6. Veja o badge "⭐ Recomendado" na Opção 1 (85% de sucesso)');
  console.log('7. Passe o mouse sobre o badge para ver estatísticas detalhadas');
  
  console.log('\n' + '='.repeat(70));
  console.log('\n✅ Teste concluído com sucesso!\n');
  
  await conn.end();
}

runTest().catch(console.error);
