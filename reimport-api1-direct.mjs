import fetch from 'node-fetch';

async function reimportAPI1() {
  console.log('🔄 Reimportando API 1 (SMS24h) para Brazil (countryId=1)...\n');
  
  const url = 'http://localhost:3000/api/trpc/prices.importCountryServices';
  const input = {
    apiId: 1,
    countryId: 1, // Brazil correto (smshubId = 73)
    priceMultiplier: 2
  };
  
  console.log('📡 Payload:', JSON.stringify(input, null, 2));
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(input)
    });
    
    const text = await response.text();
    console.log('\n📥 Resposta bruta:', text.substring(0, 500));
    
    const result = JSON.parse(text);
    console.log('\n✅ Resultado:');
    console.log(JSON.stringify(result, null, 2));
    
  } catch (error) {
    console.error('\n❌ Erro:', error.message);
    console.error(error.stack);
  }
}

reimportAPI1();
