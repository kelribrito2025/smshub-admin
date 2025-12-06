async function importAPI1() {
  console.log('🔄 Importando API 1 (SMS24h) - Country ID 1 (smshubId=73)...\n');
  
  // Usar tRPC corretamente
  const url = 'http://localhost:3000/api/trpc/prices.importCountryServices';
  
  const payload = {
    apiId: 1,
    countryId: 1,  // Brazil com smshubId = 73
    priceMultiplier: 2
  };
  
  console.log('📡 Enviando requisição...');
  console.log(JSON.stringify(payload, null, 2));
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload)
    });
    
    if (!response.ok) {
      const text = await response.text();
      console.error('❌ Erro HTTP:', response.status, text);
      return;
    }
    
    const result = await response.json();
    console.log('\n✅ Resultado:');
    console.log(JSON.stringify(result, null, 2));
    
  } catch (error) {
    console.error('\n❌ Erro:', error.message);
    console.error(error.stack);
  }
}

importAPI1();
