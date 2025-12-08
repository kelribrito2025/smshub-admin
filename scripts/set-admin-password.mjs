#!/usr/bin/env node
import mysql from 'mysql2/promise';
import bcrypt from 'bcrypt';
import 'dotenv/config';

/**
 * Script to set password for admin user
 * Usage: node scripts/set-admin-password.mjs <email> <password>
 */

const [,, email, password] = process.argv;

if (!email || !password) {
  console.error('❌ Usage: node scripts/set-admin-password.mjs <email> <password>');
  console.error('   Example: node scripts/set-admin-password.mjs admin@exemplo.com SenhaSegura123');
  process.exit(1);
}

if (password.length < 8) {
  console.error('❌ Senha deve ter no mínimo 8 caracteres');
  process.exit(1);
}

(async () => {
  let conn;
  try {
    // Connect to database
    conn = await mysql.createConnection(process.env.DATABASE_URL);
    
    // Find user
    const [users] = await conn.execute(
      'SELECT id, email, role FROM users WHERE email = ?',
      [email]
    );

    if (users.length === 0) {
      console.error(`❌ Usuário com email "${email}" não encontrado`);
      process.exit(1);
    }

    const user = users[0];

    // Check if user is admin
    if (user.role !== 'admin') {
      console.error(`❌ Usuário "${email}" não é admin (role: ${user.role})`);
      process.exit(1);
    }

    // Hash password
    console.log('🔐 Gerando hash da senha...');
    const passwordHash = await bcrypt.hash(password, 10);

    // Update user
    await conn.execute(
      'UPDATE users SET passwordHash = ? WHERE id = ?',
      [passwordHash, user.id]
    );

    console.log('✅ Senha definida com sucesso!');
    console.log(`   Email: ${email}`);
    console.log(`   Role: ${user.role}`);
    console.log('');
    console.log('Agora você pode fazer login em /admin/login');

  } catch (error) {
    console.error('❌ Erro:', error.message);
    process.exit(1);
  } finally {
    if (conn) await conn.end();
  }
})();
