// Teste de conversão de preços

console.log('=== TESTE DE CONVERSÃO DE PREÇOS ===\n');

// Simular preços retornados pelas APIs
const testCases = [
  { api: 'API 1 (SMS24h)', price: 0.70, expected: 70 },
  { api: 'API 1 (SMS24h)', price: 0.50, expected: 50 },
  { api: 'API 2 (SMSHub)', price: 0.0181, expected: 2 },  // Arredonda para 2
  { api: 'API 2 (SMSHub)', price: 0.0187, expected: 2 },  // Arredonda para 2
  { api: 'API 3 (SMSActivate)', price: 0.3, expected: 30 },
  { api: 'API 3 (SMSActivate)', price: 0.024, expected: 2 },
];

console.log('Fórmula: Math.round(priceInReais * 100)\n');

let allPassed = true;

for (const test of testCases) {
  const result = Math.round(test.price * 100);
  const passed = result === test.expected;
  
  console.log(`${passed ? '✅' : '❌'} ${test.api}`);
  console.log(`   Entrada: R$ ${test.price.toFixed(4)}`);
  console.log(`   Resultado: ${result} centavos`);
  console.log(`   Esperado: ${test.expected} centavos`);
  console.log('');
  
  if (!passed) allPassed = false;
}

console.log('='.repeat(60));
console.log(allPassed ? '✅ TODOS OS TESTES PASSARAM!' : '❌ ALGUNS TESTES FALHARAM');
console.log('='.repeat(60));
