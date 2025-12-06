import { db } from '../server/db.js';
import { services } from '../drizzle/schema.js';
import { inArray } from 'drizzle-orm';

const codes = ['dr', 'ds', 'ew', 'fs', 'dh', 'ace'];

const result = await db.select().from(services).where(inArray(services.smshubCode, codes));

console.log('📋 Serviços encontrados:\n');
result.forEach(s => {
  console.log(`  ${s.smshubCode.padEnd(6)} → ${s.name}`);
});

process.exit(0);
