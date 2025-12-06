import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import { smsApis, prices, countries, services } from './drizzle/schema.ts';
import { eq, and } from 'drizzle-orm';
import { getServiceName } from './shared/service-names.ts';

const API_URL = 'https://api.sms24h.org/stubs/handler_api';
const API_TOKEN = '5115b2c78832b7f8a5150084c81f8734';
const API_ID = 2;
const MARKUP_PERCENTAGE = 100;

// Categorias de serviços
const SERVICE_CATEGORIES = {
  wa: 'Social', tg: 'Social', vk: 'Social', fb: 'Social', ig: 'Social',
  go: 'Email', ya: 'Email', ma: 'Email',
  uk: 'Finance', vi: 'Finance', pp: 'Finance',
  am: 'Shopping',
  ot: 'Other',
};

async function importServices() {
  console.log('🚀 Conectando ao banco de dados...');
  
  const connection = await mysql.createConnection(process.env.DATABASE_URL);
  const db = drizzle(connection);
  
  console.log('📡 Buscando preços da API 2...');
  const pricesUrl = \`\${API_URL}?api_key=\${API_TOKEN}&action=getPrices&country=73\`;
  const response = await fetch(pricesUrl);
  const pricesData = await response.json();
  
  let imported = 0;
  let updated = 0;
  let servicesCreated = 0;
  
  console.log('🔄 Processando serviços...\n');
  
  for (const [countryCode, countryData] of Object.entries(pricesData)) {
    // Buscar país no banco (Brasil = 73)
    const countryResults = await db.select().from(countries).where(eq(countries.smshubId, 73)).limit(1);
    if (countryResults.length === 0) {
      console.log('⚠️  País Brasil não encontrado no banco');
      continue;
    }
    const country = countryResults[0];
    
    for (const [serviceCode, servicePrices] of Object.entries(countryData)) {
      // Buscar ou criar serviço
      let serviceResults = await db.select().from(services).where(eq(services.smshubCode, serviceCode)).limit(1);
      let service = serviceResults[0];
      
      if (!service) {
        const category = SERVICE_CATEGORIES[serviceCode] || 'Other';
        const serviceName = getServiceName(serviceCode);
        
        await db.insert(services).values({
          smshubCode: serviceCode,
          name: serviceName,
          category,
          active: true,
          markupPercentage: 0,
          markupFixed: 0,
          createdAt: new Date(),
        });
        
        serviceResults = await db.select().from(services).where(eq(services.smshubCode, serviceCode)).limit(1);
        service = serviceResults[0];
        servicesCreated++;
      }
      
      if (!service) continue;
      
      // Processar preços
      for (const [priceStr, quantity] of Object.entries(servicePrices)) {
        const smshubPrice = Math.round(parseFloat(priceStr) * 100);
        const ourPrice = smshubPrice + Math.round(smshubPrice * (MARKUP_PERCENTAGE / 100));
        
        // Verificar se já existe
        const existingPrices = await db
          .select()
          .from(prices)
          .where(
            and(
              eq(prices.countryId, country.id),
              eq(prices.serviceId, service.id),
              eq(prices.apiId, API_ID)
            )
          )
          .limit(1);
        
        if (existingPrices.length > 0) {
          await db
            .update(prices)
            .set({
              smshubPrice,
              ourPrice,
              quantityAvailable: quantity,
              lastSync: new Date(),
            })
            .where(eq(prices.id, existingPrices[0].id));
          updated++;
        } else {
          await db.insert(prices).values({
            apiId: API_ID,
            countryId: country.id,
            serviceId: service.id,
            smshubPrice,
            ourPrice,
            quantityAvailable: quantity,
            lastSync: new Date(),
            createdAt: new Date(),
          });
          imported++;
        }
      }
    }
  }
  
  await connection.end();
  
  console.log('\n✅ Importação concluída!');
  console.log(\`   - Preços importados: \${imported}\`);
  console.log(\`   - Preços atualizados: \${updated}\`);
  console.log(\`   - Serviços criados: \${servicesCreated}\`);
  console.log(\`   - Total: \${imported + updated}\`);
}

importServices().catch(console.error);
