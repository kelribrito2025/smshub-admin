import { getDb } from '../server/db';
import { customers } from '../drizzle/schema';

async function main() {
  const db = await getDb();
  if (!db) {
    console.error('❌ Erro: banco de dados não disponível');
    process.exit(1);
  }
  
  const customerList = await db.select({
    id: customers.id,
    name: customers.name,
    email: customers.email,
    active: customers.active,
    banned: customers.banned
  }).from(customers).limit(5);

  console.log('Customers no banco:');
  console.table(customerList);

  if (customerList.length === 0) {
    console.log('\n⚠️  Nenhum customer encontrado no banco.');
  } else {
    console.log(`\n✅ Total: ${customerList.length} customer(s) encontrado(s)`);
    console.log(`\n💡 Para testar SSE, use o ID: ${customerList[0].id}`);
  }
  
  process.exit(0);
}

main().catch(console.error);
