import 'dotenv/config';
import mysql from 'mysql2/promise';

const API_TOKEN = 'b9202b2bd66bf510e10d08f0A485fd27';
const API_URL = 'https://api.sms-activate.io/stubs/handler_api.php';
const API_ID = 3;
const COUNTRY_ID = 1; // Brazil
const PRICE_MULTIPLIER = 2;

async function reimportPrices() {
  console.log('🔄 Reimportando preços da API 3 (SMSActivate)...\n');
  
  const connection = await mysql.createConnection(process.env.DATABASE_URL);
  
  try {
    // 1. Buscar preços da API
    const url = `${API_URL}?api_key=${API_TOKEN}&action=getPrices&country=73`;
    const response = await fetch(url);
    const data = await response.json();
    
    if (!data['73']) {
      console.log('❌ Dados do Brasil não encontrados na API');
      return;
    }
    
    const brazilServices = data['73'];
    console.log(`✅ ${Object.keys(brazilServices).length} serviços encontrados na API\n`);
    
    let updated = 0;
    let created = 0;
    let skipped = 0;
    let errors = 0;
    
    // 2. Processar cada serviço
    for (const [serviceCode, priceData] of Object.entries(brazilServices)) {
      try {
        // Extrair preço e quantidade (formato SMSActivate)
        if (!priceData.cost || priceData.cost <= 0) {
          skipped++;
          continue;
        }
        
        const cost = parseFloat(priceData.cost);
        const count = parseInt(priceData.count) || 0;
        
        // Converter para centavos
        const smshubPrice = Math.round(cost * 100);
        const ourPrice = Math.round(smshubPrice * PRICE_MULTIPLIER);
        
        // Buscar serviço no banco
        const [services] = await connection.execute(
          'SELECT id FROM services WHERE smshubCode = ? LIMIT 1',
          [serviceCode]
        );
        
        let serviceId;
        
        if (services.length === 0) {
          // Criar serviço
          const [result] = await connection.execute(
            'INSERT INTO services (name, smshubCode, category, active, createdAt) VALUES (?, ?, ?, ?, NOW())',
            [serviceCode.toUpperCase(), serviceCode, 'Other', 1]
          );
          serviceId = result.insertId;
          created++;
        } else {
          serviceId = services[0].id;
        }
        
        // Atualizar ou criar preço
        await connection.execute(`
          INSERT INTO prices (apiId, countryId, serviceId, smshubPrice, ourPrice, quantityAvailable, createdAt, active)
          VALUES (?, ?, ?, ?, ?, ?, NOW(), 1)
          ON DUPLICATE KEY UPDATE
            smshubPrice = VALUES(smshubPrice),
            ourPrice = VALUES(ourPrice),
            quantityAvailable = VALUES(quantityAvailable),
            lastSync = NOW()
        `, [API_ID, COUNTRY_ID, serviceId, smshubPrice, ourPrice, count]);
        
        updated++;
        
        if (updated % 50 === 0) {
          console.log(`📊 Progresso: ${updated} serviços processados...`);
        }
        
      } catch (error) {
        console.error(`❌ Erro ao processar ${serviceCode}:`, error.message);
        errors++;
      }
    }
    
    console.log('\n✅ Reimportação concluída!');
    console.log(`- Atualizados: ${updated}`);
    console.log(`- Criados: ${created}`);
    console.log(`- Pulados: ${skipped}`);
    console.log(`- Erros: ${errors}`);
    
    // Verificar alguns preços atualizados
    console.log('\n📋 Verificando preços atualizados:');
    const [samples] = await connection.execute(`
      SELECT 
        s.name,
        p.smshubPrice,
        p.ourPrice,
        p.quantityAvailable
      FROM prices p
      JOIN services s ON p.serviceId = s.id
      WHERE p.apiId = 3 AND p.smshubPrice > 0
      ORDER BY RAND()
      LIMIT 5
    `);
    
    samples.forEach(row => {
      console.log(`- ${row.name}: Custo R$ ${(row.smshubPrice/100).toFixed(2)}, Venda R$ ${(row.ourPrice/100).toFixed(2)}, Qtd: ${row.quantityAvailable}`);
    });
    
  } finally {
    await connection.end();
  }
}

reimportPrices().catch(console.error);
