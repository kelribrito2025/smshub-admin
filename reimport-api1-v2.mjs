async function reimportAPI1() {
  console.log('🔄 Reimportando API 1 (SMS24h) para Brazil (countryId=1)...\n');
  
  const url = 'http://localhost:3000/api/trpc/prices.importCountryServices';
  const input = {
    apiId: 1,
    countryId: 1,
    priceMultiplier: 2
  };
  
  console.log('📡 Payload:', JSON.stringify(input, null, 2));
  console.log('⏳ Aguardando resposta da API (pode demorar 1-2 minutos)...\n');
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(input)
    });
    
    const result = await response.json();
    console.log('\n✅ Importação concluída!');
    console.log(JSON.stringify(result, null, 2));
    
  } catch (error) {
    console.error('\n❌ Erro:', error.message);
  }
}

reimportAPI1();
