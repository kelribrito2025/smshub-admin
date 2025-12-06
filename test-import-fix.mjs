// Simular a nova lógica de extração
const testData = {
  "aa": {
    "0.0181": 17408,
    "0.0183": 1,
    "0.0187": 129,
    "0.0224": 252,
    "0.0232": 31,
    "0.0237": 6,
    "0.0239": 480,
    "0.0240": 29781
  },
  "aaa": {
    "0.1875": 504190,
    "0.2465": 5,
    "0.2487": 416,
    "0.2495": 20,
    "0.2500": 3865
  }
};

console.log('Testando nova lógica de extração:\n');

for (const [serviceCode, priceData] of Object.entries(testData)) {
  let priceValue;
  let quantity = 0;
  
  if (typeof priceData === 'object' && priceData !== null) {
    const entries = Object.entries(priceData);
    
    if (entries.length > 0) {
      // Extract all prices and quantities
      const pricesAndQuantities = entries.map(([price, qty]) => ({
        price: parseFloat(String(price)),
        quantity: typeof qty === 'number' ? qty : 0
      })).filter(item => !isNaN(item.price) && item.price > 0);
      
      if (pricesAndQuantities.length > 0) {
        // Use the lowest price (best deal for customers)
        priceValue = Math.min(...pricesAndQuantities.map(p => p.price));
        
        // Sum all quantities to get total availability
        quantity = pricesAndQuantities.reduce((sum, item) => sum + item.quantity, 0);
      }
    }
  }
  
  console.log(`Serviço: ${serviceCode}`);
  console.log(`  Menor preço: R$ ${priceValue?.toFixed(4)}`);
  console.log(`  Quantidade total: ${quantity.toLocaleString('pt-BR')}`);
  console.log('');
}
