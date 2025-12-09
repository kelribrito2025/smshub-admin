#!/usr/bin/env tsx

/**
 * Script para definir senha em contas existentes que não têm passwordHash
 * Uso: tsx scripts/set-password-for-existing-accounts.ts <email> <password>
 */

import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import bcrypt from 'bcrypt';
import { eq } from 'drizzle-orm';
import { customers } from '../drizzle/schema.js';

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL não configurada');
  process.exit(1);
}

const email = process.argv[2];
const password = process.argv[3];

if (!email || !password) {
  console.error('❌ Uso: tsx scripts/set-password-for-existing-accounts.ts <email> <password>');
  console.error('   Exemplo: tsx scripts/set-password-for-existing-accounts.ts user@example.com senha123');
  process.exit(1);
}

if (password.length < 8) {
  console.error('❌ A senha deve ter no mínimo 8 caracteres');
  process.exit(1);
}

async function setPassword() {
  console.log(`\n🔐 Definindo senha para conta: ${email}`);
  
  const connection = await mysql.createConnection(DATABASE_URL);
  const db = drizzle(connection);

  try {
    // Buscar customer por email
    const [customer] = await db.select().from(customers).where(eq(customers.email, email)).limit(1);

    if (!customer) {
      console.error(`❌ Conta não encontrada: ${email}`);
      process.exit(1);
    }

    console.log(`✅ Conta encontrada: ID ${customer.id}, PIN #${customer.pin}`);

    // Gerar hash da senha
    console.log('🔒 Gerando hash da senha...');
    const passwordHash = await bcrypt.hash(password, 10);

    // Atualizar senha no banco
    await db.update(customers)
      .set({ password: passwordHash })
      .where(eq(customers.id, customer.id));

    console.log(`✅ Senha definida com sucesso para ${email}`);
    console.log(`   Hash: ${passwordHash.substring(0, 20)}...`);
    
    // Testar hash
    const isValid = await bcrypt.compare(password, passwordHash);
    console.log(`✅ Validação do hash: ${isValid ? 'OK' : 'FALHOU'}`);

  } catch (error: any) {
    console.error('❌ Erro ao definir senha:', error.message);
    process.exit(1);
  } finally {
    await connection.end();
  }
}

setPassword();
