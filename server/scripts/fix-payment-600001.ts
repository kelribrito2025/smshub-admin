/**
 * Script para recuperar endToEndId do pagamento #600001 especificamente
 */

import { getDb } from "../db";
import { recharges, pixTransactions } from "../../drizzle/schema";
import { eq } from "drizzle-orm";
import { efiPayClient } from "../efipay-client";

async function fixPayment600001() {
  console.log("\n========== Recuperando endToEndId do Pagamento #600001 ==========\n");

  const db = await getDb();
  if (!db) {
    console.error("❌ Database not available");
    return;
  }

  if (!efiPayClient) {
    console.error("❌ EfiPay client not available");
    return;
  }

  // Get payment #600001
  const [recharge] = await db
    .select()
    .from(recharges)
    .where(eq(recharges.id, 600001))
    .limit(1);

  if (!recharge) {
    console.error("❌ Pagamento #600001 não encontrado");
    return;
  }

  console.log("📋 Detalhes do pagamento #600001:");
  console.log(JSON.stringify(recharge, null, 2));

  if (!recharge.transactionId) {
    console.error("❌ Pagamento #600001 não tem transactionId");
    return;
  }

  console.log(`\n🔍 Consultando API da Gerencianet para txid: ${recharge.transactionId}...`);

  try {
    // Get charge details from EfiPay API
    const chargeDetails = await efiPayClient.getCharge(recharge.transactionId);

    console.log("\n📥 Resposta da API:");
    console.log(JSON.stringify(chargeDetails, null, 2));

    // Extract endToEndId from pix array
    let endToEndId: string | null = null;

    if (chargeDetails.pix && Array.isArray(chargeDetails.pix) && chargeDetails.pix.length > 0) {
      endToEndId = chargeDetails.pix[0].endToEndId;
    }

    if (!endToEndId) {
      console.error("\n❌ endToEndId não encontrado na resposta da API");
      console.error("Possíveis causas:");
      console.error("  1. Pagamento não foi confirmado");
      console.error("  2. Pagamento expirou");
      console.error("  3. API não retornou dados do PIX");
      return;
    }

    console.log(`\n✅ endToEndId encontrado: ${endToEndId}`);

    // Update recharge record
    console.log("\n📝 Atualizando registro de recarga...");
    await db
      .update(recharges)
      .set({ endToEndId })
      .where(eq(recharges.id, 600001));

    // Also update pixTransactions if exists
    console.log("📝 Atualizando registro de transação PIX...");
    await db
      .update(pixTransactions)
      .set({ endToEndId })
      .where(eq(pixTransactions.txid, recharge.transactionId));

    console.log("\n✅ Pagamento #600001 atualizado com sucesso!");
    console.log(`   endToEndId: ${endToEndId}`);

    // Verify update
    const [updatedRecharge] = await db
      .select()
      .from(recharges)
      .where(eq(recharges.id, 600001))
      .limit(1);

    console.log("\n✅ Verificação final:");
    console.log(`   ID: ${updatedRecharge.id}`);
    console.log(`   txid: ${updatedRecharge.transactionId}`);
    console.log(`   endToEndId: ${updatedRecharge.endToEndId}`);
    console.log(`   Status: ${updatedRecharge.status}`);

  } catch (error: any) {
    console.error("\n❌ Erro ao consultar API:", error.message);
    console.error("Stack trace:", error.stack);
  }

  console.log("\n==========================================\n");
}

// Run the script
fixPayment600001()
  .then(() => {
    console.log("✅ Script finalizado!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Erro fatal:", error);
    process.exit(1);
  });
