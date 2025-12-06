const API_URL = 'https://api.sms24h.org/stubs/handler_api';
const API_TOKEN = '5115b2c78832b7f8a5150084c81f8734';

async function checkServices() {
  try {
    // Buscar países disponíveis
    const countriesUrl = `${API_URL}?api_key=${API_TOKEN}&action=getCountries`;
    const countriesRes = await fetch(countriesUrl);
    const countriesText = await countriesRes.text();
    const countries = JSON.parse(countriesText);
    
    console.log('Países disponíveis na API 2:', Object.keys(countries).length);
    console.log('Países:', Object.keys(countries).slice(0, 5).join(', '), '...\n');
    
    // Buscar preços de todos os países
    const pricesUrl = `${API_URL}?api_key=${API_TOKEN}&action=getPrices`;
    const pricesRes = await fetch(pricesUrl);
    const pricesText = await pricesRes.text();
    const prices = JSON.parse(pricesText);
    
    // Contar total de serviços únicos
    const services = new Set();
    const servicesByCountry = {};
    
    Object.entries(prices).forEach(([countryId, countryServices]) => {
      Object.keys(countryServices).forEach(service => {
        services.add(service);
        if (!servicesByCountry[countryId]) servicesByCountry[countryId] = [];
        servicesByCountry[countryId].push(service);
      });
    });
    
    console.log('Total de serviços únicos na API 2:', services.size);
    console.log('Exemplos de serviços:', Array.from(services).slice(0, 15).join(', '));
    console.log('\nDistribuição por país:');
    Object.entries(servicesByCountry).slice(0, 5).forEach(([country, svcs]) => {
      console.log(`  ${countries[country]}: ${svcs.length} serviços`);
    });
    
  } catch (error) {
    console.error('Erro:', error.message);
  }
}

checkServices();
