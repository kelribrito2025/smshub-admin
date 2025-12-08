import bcrypt from 'bcrypt';
import mysql from 'mysql2/promise';
import { config } from 'dotenv';

config();

const SALT_ROUNDS = 10;

async function setAdminPassword() {
  const email = process.argv[2];
  const password = process.argv[3];

  if (!email || !password) {
    console.error('Usage: node scripts/set-admin-password.mjs <email> <password>');
    process.exit(1);
  }

  if (password.length < 8) {
    console.error('Password must be at least 8 characters');
    process.exit(1);
  }

  try {
    // Connect to database
    const connection = await mysql.createConnection(process.env.DATABASE_URL);

    // Hash password
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    // Update user
    const [result] = await connection.execute(
      'UPDATE users SET passwordHash = ? WHERE email = ? AND role = "admin"',
      [passwordHash, email]
    );

    if (result.affectedRows === 0) {
      console.error(`No admin user found with email: ${email}`);
      process.exit(1);
    }

    console.log(`✅ Password set successfully for admin: ${email}`);
    
    await connection.end();
  } catch (error) {
    console.error('Error setting password:', error);
    process.exit(1);
  }
}

setAdminPassword();
