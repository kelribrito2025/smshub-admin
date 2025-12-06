import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import * as schema from './drizzle/schema.js';
import { eq, sql } from 'drizzle-orm';

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL não encontrada');
  process.exit(1);
}

const connection = await mysql.createConnection(DATABASE_URL);
const db = drizzle(connection, { schema, mode: 'default' });

console.log('🔄 Buscando todos os serviços disponíveis...');

// Buscar todos os serviços
const allServices = await db.select().from(schema.services);

if (allServices.length < 20) {
  console.error(`❌ Apenas ${allServices.length} serviços encontrados. Precisamos de pelo menos 20.`);
  await connection.end();
  process.exit(1);
}

console.log(`✅ ${allServices.length} serviços encontrados`);

// Selecionar 20 serviços aleatórios
const shuffled = allServices.sort(() => 0.5 - Math.random());
const selectedServices = shuffled.slice(0, 20);

console.log('\n📊 Serviços selecionados para simulação:');
selectedServices.forEach((service, index) => {
  console.log(`${index + 1}. ${service.name} (ID: ${service.id}) - ${20 - index} ativações`);
});

console.log('\n🔄 Criando ativações simuladas...');

// Criar ativações para cada serviço (20, 19, 18... até 1)
for (let i = 0; i < selectedServices.length; i++) {
  const service = selectedServices[i];
  const activationCount = 20 - i;
  
  console.log(`\n📝 Criando ${activationCount} ativações para ${service.name}...`);
  
  for (let j = 0; j < activationCount; j++) {
    await db.insert(schema.activations).values({
      userId: 'test-user-' + Math.random().toString(36).substring(7),
      countryId: 1, // Brasil
      serviceId: service.id,
      number: `+5511${Math.floor(900000000 + Math.random() * 100000000)}`,
      activationId: `sim-${Date.now()}-${Math.random().toString(36).substring(7)}`,
      status: 'completed',
      cost: 100,
      price: 200,
      profit: 100,
      smsCode: '123456',
      createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000), // Últimos 30 dias
      updatedAt: new Date(),
    });
  }
  
  console.log(`✅ ${activationCount} ativações criadas`);
}

console.log('\n✅ Script concluído com sucesso!');
console.log('\n📊 Resumo:');
console.log(`- 20 serviços selecionados`);
console.log(`- ${(20 * 21) / 2} ativações totais criadas (20+19+18+...+1)`);
console.log(`- Status: completed`);

await connection.end();
