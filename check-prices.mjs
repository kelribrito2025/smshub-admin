import axios from 'axios';

const api1Url = 'https://smshub.org/stubs/handler_api.php';
const api1Token = '107241Ud056a935ea159b3887c2b8b6f3922322';

console.log('Verificando preços da API SMSHub para Brasil (país 73)...\n');

try {
  const response = await axios.get(api1Url, {
    params: {
      api_key: api1Token,
      action: 'getPrices',
      country: 73,
    }
  });
  
  const data = typeof response.data === 'string' ? JSON.parse(response.data) : response.data;
  const services = data['73'];
  
  // Procurar "Outros Apps" - código pode ser "ot", "other", etc
  console.log('Procurando serviço "Outros Apps"...\n');
  
  // Listar alguns códigos para identificar
  const codes = Object.keys(services);
  console.log(`Total de serviços: ${codes.length}`);
  console.log('Primeiros 20 códigos:', codes.slice(0, 20).join(', '));
  console.log('\n');
  
  // Verificar se há "ot" ou similar
  const otherServices = codes.filter(c => c.toLowerCase().includes('ot') || c.toLowerCase().includes('other'));
  console.log('Serviços com "ot" ou "other":', otherServices);
  
  if (otherServices.length > 0) {
    otherServices.forEach(code => {
      const priceData = services[code];
      console.log(`\nServiço: ${code}`);
      console.log('Dados:', JSON.stringify(priceData, null, 2));
      
      // Calcular menor preço
      const prices = Object.keys(priceData).map(p => parseFloat(p));
      const minPrice = Math.min(...prices);
      console.log(`Menor preço: R$ ${minPrice.toFixed(4)}`);
    });
  }
  
  // Também mostrar alguns serviços aleatórios para comparação
  console.log('\n\n=== Exemplos de outros serviços ===');
  const samples = ['wa', 'tg', 'ig', 'fb', 'go'].filter(c => services[c]);
  samples.forEach(code => {
    const priceData = services[code];
    const prices = Object.keys(priceData).map(p => parseFloat(p));
    const minPrice = Math.min(...prices);
    console.log(`${code}: menor preço = R$ ${minPrice.toFixed(4)}`);
  });
  
} catch (error) {
  console.error('Erro:', error.message);
}
