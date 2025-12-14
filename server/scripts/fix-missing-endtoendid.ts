/**
 * Script para recuperar endToEndId de pagamentos PIX antigos
 * que foram processados antes da implementação do campo endToEndId
 */

import { getDb } from "../db";
import { recharges, pixTransactions } from "../../drizzle/schema";
import { eq, and, isNull } from "drizzle-orm";
import { efiPayClient } from "../efipay-client";

async function fixMissingEndToEndId() {
  console.log("\n========== Recuperando endToEndId de Pagamentos Antigos ==========\n");

  const db = await getDb();
  if (!db) {
    console.error("❌ Database not available");
    return;
  }

  if (!efiPayClient) {
    console.error("❌ EfiPay client not available");
    return;
  }

  // Find all completed PIX recharges without endToEndId
  const rechargesWithoutE2E = await db
    .select()
    .from(recharges)
    .where(
      and(
        eq(recharges.paymentMethod, "pix"),
        eq(recharges.status, "completed"),
        isNull(recharges.endToEndId)
      )
    )
    .limit(100);

  console.log(`📊 Encontrados ${rechargesWithoutE2E.length} pagamentos PIX sem endToEndId\n`);

  if (rechargesWithoutE2E.length === 0) {
    console.log("✅ Todos os pagamentos PIX já possuem endToEndId!");
    return;
  }

  let successCount = 0;
  let failCount = 0;

  for (const recharge of rechargesWithoutE2E) {
    try {
      console.log(`\n🔍 Processando recarga #${recharge.id} (txid: ${recharge.transactionId})...`);

      if (!recharge.transactionId) {
        console.log(`⚠️  Recarga #${recharge.id} não tem transactionId, pulando...`);
        failCount++;
        continue;
      }

      // Get charge details from EfiPay API
      const chargeDetails = await efiPayClient.getCharge(recharge.transactionId);

      console.log("📥 Resposta da API:", JSON.stringify(chargeDetails, null, 2));

      // Extract endToEndId from pix array (if payment was confirmed)
      let endToEndId: string | null = null;

      if (chargeDetails.pix && Array.isArray(chargeDetails.pix) && chargeDetails.pix.length > 0) {
        endToEndId = chargeDetails.pix[0].endToEndId;
      }

      if (!endToEndId) {
        console.log(`⚠️  Recarga #${recharge.id}: endToEndId não encontrado na resposta da API`);
        failCount++;
        continue;
      }

      console.log(`✅ endToEndId encontrado: ${endToEndId}`);

      // Update recharge record
      await db
        .update(recharges)
        .set({ endToEndId })
        .where(eq(recharges.id, recharge.id));

      // Also update pixTransactions if exists
      if (recharge.transactionId) {
        await db
          .update(pixTransactions)
          .set({ endToEndId })
          .where(eq(pixTransactions.txid, recharge.transactionId));
      }

      console.log(`✅ Recarga #${recharge.id} atualizada com sucesso!`);
      successCount++;

      // Wait 500ms between API calls to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));

    } catch (error: any) {
      console.error(`❌ Erro ao processar recarga #${recharge.id}:`, error.message);
      failCount++;
    }
  }

  console.log("\n========== Resumo da Recuperação ==========");
  console.log(`✅ Sucessos: ${successCount}`);
  console.log(`❌ Falhas: ${failCount}`);
  console.log(`📊 Total processado: ${successCount + failCount}`);
  console.log("==========================================\n");
}

// Run the script
fixMissingEndToEndId()
  .then(() => {
    console.log("✅ Script finalizado!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Erro fatal:", error);
    process.exit(1);
  });
