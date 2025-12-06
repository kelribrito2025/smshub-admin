import { recalculatePricesForAPI } from './server/exchange-rate';

console.log('🔄 Recalculando preços da API Opção 2 (SMSHub)...\n');

recalculatePricesForAPI(2)
  .then(count => {
    console.log(`\n✅ Sucesso! ${count} preços foram recalculados.`);
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Erro:', error);
    process.exit(1);
  });
