import { getDb } from './server/db-helpers.ts';
import { smsApis } from './drizzle/schema.ts';

const db = await getDb();
const apis = await db.select().from(smsApis);

console.log('APIs configuradas:\n');
apis.forEach(api => {
  console.log(`API ${api.id}: ${api.name}`);
  console.log(`  URL: ${api.url}`);
  console.log(`  Token: ${api.token?.substring(0, 20)}...`);
  console.log(`  Ativa: ${api.active}`);
  console.log('');
});
