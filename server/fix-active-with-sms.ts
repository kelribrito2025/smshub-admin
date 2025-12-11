import { getDb } from './db';
import { activations } from '../drizzle/schema';
import { eq, and, isNotNull, ne } from 'drizzle-orm';

/**
 * Script para corrigir ativações antigas que têm SMS code mas ainda estão com status "active"
 * Após a correção no código, isso não acontecerá mais, mas precisamos corrigir dados históricos
 */
async function fixActiveActivationsWithSms() {
  const db = await getDb();
  if (!db) {
    console.error('❌ Database not available');
    process.exit(1);
  }

  console.log('🔍 Buscando ativações "active" com SMS code...\n');

  // Buscar ativações problemáticas
  const problematicActivations = await db
    .select()
    .from(activations)
    .where(
      and(
        eq(activations.status, 'active'),
        isNotNull(activations.smsCode),
        ne(activations.smsCode, '')
      )
    );

  if (problematicActivations.length === 0) {
    console.log('✅ Nenhuma ativação problemática encontrada!');
    console.log('✅ Todos os pedidos estão com status correto.');
    process.exit(0);
  }

  console.log(`⚠️ Encontradas ${problematicActivations.length} ativações para corrigir:\n`);
  
  problematicActivations.forEach((a, index) => {
    console.log(`${index + 1}. Activation ${a.id}:`);
    console.log(`   - Phone: ${a.phoneNumber}`);
    console.log(`   - SMS Code: ${a.smsCode}`);
    console.log(`   - Created: ${a.createdAt}`);
    console.log('');
  });

  console.log('🔧 Corrigindo status para "completed"...\n');

  let successCount = 0;
  let errorCount = 0;

  for (const activation of problematicActivations) {
    try {
      await db
        .update(activations)
        .set({
          status: 'completed',
          completedAt: new Date(), // Usar data atual como completedAt
        })
        .where(eq(activations.id, activation.id));

      console.log(`✅ Activation ${activation.id} corrigida`);
      successCount++;
    } catch (error: any) {
      console.error(`❌ Erro ao corrigir Activation ${activation.id}:`, error.message);
      errorCount++;
    }
  }

  console.log('\n📊 RESULTADO:');
  console.log(`✅ Corrigidas com sucesso: ${successCount}`);
  if (errorCount > 0) {
    console.log(`❌ Erros: ${errorCount}`);
  }
  console.log('\n✅ Script concluído!');
}

// Executar script
fixActiveActivationsWithSms()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Erro fatal:', error);
    process.exit(1);
  });
