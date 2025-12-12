/**
 * Script para verificar conta xkelrix@gmail.com no banco
 * Execute com: pnpm tsx server/check-xkelrix-account.ts
 */

import { getCustomerByEmail } from './customers-helpers';

async function main() {
  console.log('🔍 Verificando conta xkelrix@gmail.com...\n');

  try {
    const customer = await getCustomerByEmail('xkelrix@gmail.com');
    
    if (customer) {
      console.log('✅ Conta encontrada:');
      console.log(JSON.stringify(customer, null, 2));
    } else {
      console.log('❌ Conta não encontrada no banco de dados');
    }
  } catch (error) {
    console.error('❌ Erro ao buscar conta:', error);
    process.exit(1);
  }
}

main();
