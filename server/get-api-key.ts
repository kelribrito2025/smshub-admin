/**
 * Script para buscar API key ativa do banco
 * Execute com: pnpm tsx server/get-api-key.ts
 */

import { getDb } from './db';
import { apiKeys } from '../drizzle/schema';
import { eq } from 'drizzle-orm';

async function main() {
  console.log('🔍 Buscando API key ativa...\n');

  try {
    const db = await getDb();
    if (!db) {
      console.error('❌ Database not available');
      process.exit(1);
    }

    const [key] = await db
      .select()
      .from(apiKeys)
      .where(eq(apiKeys.active, 1))
      .limit(1);

    if (key) {
      console.log('✅ API Key encontrada:');
      console.log(`   Key: ${key.key}`);
      console.log(`   Name: ${key.name}`);
      console.log(`   Active: ${key.active}`);
    } else {
      console.log('❌ Nenhuma API key ativa encontrada');
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Erro ao buscar API key:', error);
    process.exit(1);
  }
}

main();
