import { db } from './server/db';
import { smsApis } from './drizzle/schema';

const apis = await db.select({
  id: smsApis.id,
  name: smsApis.name,
  currency: smsApis.currency,
  exchangeRate: smsApis.exchangeRate
}).from(smsApis).orderBy(smsApis.id);

console.log('\n📊 Status de Sincronização Automática de Câmbio:\n');
apis.forEach(api => {
  console.log(`API ${api.id} - ${api.name}:`);
  console.log(`  💱 Moeda: ${api.currency}`);
  console.log(`  📈 Taxa de Câmbio: ${api.exchangeRate}`);
  console.log(`  🔄 Sincronização automática: ${api.currency === 'USD' ? '✅ SIM (atualiza a cada 2h)' : '❌ NÃO (moeda BRL, sem conversão)'}`);
  console.log('');
});

process.exit(0);
