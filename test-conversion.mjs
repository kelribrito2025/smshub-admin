// Test script to validate USD to BRL conversion
import { calculateFinalPrice } from './server/price-calculator.js';

console.log('=== Teste de Conversão USD → BRL ===\n');

// Cenário 1: $0.70 USD com taxa de câmbio 6.00 e lucro 150%
const test1 = {
  smshubPrice: 70, // 70 centavos USD
  profitPercentage: 150,
  minimumPrice: 100, // R$ 1,00
  currency: 'USD',
  exchangeRate: 6.0
};

const result1 = calculateFinalPrice(
  test1.smshubPrice,
  test1.profitPercentage,
  test1.minimumPrice,
  test1.currency,
  test1.exchangeRate
);

console.log('Cenário 1: WhatsApp Brasil');
console.log('  Preço API: $0.70 USD (70 centavos)');
console.log('  Taxa de câmbio: 6.00');
console.log('  Conversão: 70 × 6.00 = 420 centavos (R$ 4,20)');
console.log('  Taxa de lucro: 150%');
console.log('  Cálculo: 420 × 2.5 = 1050 centavos');
console.log('  Preço mínimo: R$ 1,00 (100 centavos)');
console.log(`  ✅ Resultado esperado: R$ 10,50 (1050 centavos)`);
console.log(`  📊 Resultado obtido: R$ ${(result1/100).toFixed(2)} (${result1} centavos)`);
console.log(`  ${result1 === 1050 ? '✅ PASSOU' : '❌ FALHOU'}\n`);

// Cenário 2: $0.50 USD com preço mínimo maior
const test2 = {
  smshubPrice: 50,
  profitPercentage: 150,
  minimumPrice: 1000, // R$ 10,00
  currency: 'USD',
  exchangeRate: 6.0
};

const result2 = calculateFinalPrice(
  test2.smshubPrice,
  test2.profitPercentage,
  test2.minimumPrice,
  test2.currency,
  test2.exchangeRate
);

console.log('Cenário 2: Serviço com preço mínimo alto');
console.log('  Preço API: $0.50 USD (50 centavos)');
console.log('  Taxa de câmbio: 6.00');
console.log('  Conversão: 50 × 6.00 = 300 centavos (R$ 3,00)');
console.log('  Taxa de lucro: 150%');
console.log('  Cálculo: 300 × 2.5 = 750 centavos (R$ 7,50)');
console.log('  Preço mínimo: R$ 10,00 (1000 centavos)');
console.log(`  ✅ Resultado esperado: R$ 10,00 (1000 centavos) - usa preço mínimo`);
console.log(`  📊 Resultado obtido: R$ ${(result2/100).toFixed(2)} (${result2} centavos)`);
console.log(`  ${result2 === 1000 ? '✅ PASSOU' : '❌ FALHOU'}\n`);

// Cenário 3: BRL não deve converter
const test3 = {
  smshubPrice: 70,
  profitPercentage: 150,
  minimumPrice: 0,
  currency: 'BRL',
  exchangeRate: 6.0
};

const result3 = calculateFinalPrice(
  test3.smshubPrice,
  test3.profitPercentage,
  test3.minimumPrice,
  test3.currency,
  test3.exchangeRate
);

console.log('Cenário 3: BRL não deve converter');
console.log('  Preço API: R$ 0,70 (70 centavos BRL)');
console.log('  Moeda: BRL (não converte)');
console.log('  Taxa de lucro: 150%');
console.log('  Cálculo: 70 × 2.5 = 175 centavos');
console.log(`  ✅ Resultado esperado: R$ 1,75 (175 centavos)`);
console.log(`  📊 Resultado obtido: R$ ${(result3/100).toFixed(2)} (${result3} centavos)`);
console.log(`  ${result3 === 175 ? '✅ PASSOU' : '❌ FALHOU'}\n`);

const allPassed = result1 === 1050 && result2 === 1000 && result3 === 175;
console.log(allPassed ? '✅ TODOS OS TESTES PASSARAM!' : '❌ ALGUNS TESTES FALHARAM!');
process.exit(allPassed ? 0 : 1);
