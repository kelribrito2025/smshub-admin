import { getDb } from '../server/db.js';
import { smsApis } from '../drizzle/schema.js';

const db = await getDb();
const apis = await db.select().from(smsApis).orderBy(smsApis.priority);

console.log('APIs cadastradas no banco:');
apis.forEach(api => {
  console.log(`- ID: ${api.id}, Nome: ${api.name}, URL: ${api.url.substring(0, 40)}..., Ativa: ${api.active}`);
});
