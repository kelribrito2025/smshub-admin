// Script para reimportar serviços da API 1 (SMS24h)
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

async function reimportAPI1() {
  console.log('🔄 Iniciando reimportação da API 1 (SMS24h)...\n');
  
  // Simular requisição tRPC
  const url = 'http://localhost:3000/api/trpc/prices.importCountryServices';
  const payload = {
    apiId: 1,
    countryId: 1, // Brazil
    priceMultiplier: 2
  };
  
  console.log('📡 Enviando requisição para importar serviços...');
  console.log('Payload:', JSON.stringify(payload, null, 2));
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload)
    });
    
    const result = await response.json();
    
    console.log('\n✅ Resposta recebida:');
    console.log(JSON.stringify(result, null, 2));
    
  } catch (error) {
    console.error('\n❌ Erro:', error.message);
  }
}

reimportAPI1();
