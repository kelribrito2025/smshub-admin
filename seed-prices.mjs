import mysql from 'mysql2/promise';

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL not found in environment');
  process.exit(1);
}

async function seedPrices() {
  const connection = await mysql.createConnection(DATABASE_URL);
  
  try {
    console.log('🌱 Starting prices seed...\n');

    // Whatsapp serviceId = 60001 (from existing data)
    // Brazil countryId = 1
    const serviceId = 60001;
    const countryId = 1;

    // Limpar dados existentes para este serviço/país
    await connection.execute(
      'DELETE FROM prices WHERE serviceId = ? AND countryId = ?',
      [serviceId, countryId]
    );
    console.log('🗑️  Cleared existing prices for Whatsapp/Brazil\n');

    // Inserir 3 opções de API com preços diferentes
    const prices = [
      {
        apiId: 1,
        apiName: 'Opção 1',
        smshubPrice: 245, // R$ 2.45
        ourPrice: 245,
        quantityAvailable: 100,
      },
      {
        apiId: 2,
        apiName: 'Opção 2',
        smshubPrice: 190, // R$ 1.90 (RECOMENDADA - menor preço)
        ourPrice: 190,
        quantityAvailable: 150,
      },
      {
        apiId: 3,
        apiName: 'Opção 3',
        smshubPrice: 310, // R$ 3.10
        ourPrice: 310,
        quantityAvailable: 80,
      },
    ];

    for (const price of prices) {
      await connection.execute(
        `INSERT INTO prices (apiId, countryId, serviceId, smshubPrice, ourPrice, fixedPrice, quantityAvailable, active, lastSync, createdAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
        [
          price.apiId,
          countryId,
          serviceId,
          price.smshubPrice,
          price.ourPrice,
          false, // fixedPrice
          price.quantityAvailable,
          true, // active
        ]
      );
      console.log(`✅ Added ${price.apiName}: R$ ${(price.ourPrice / 100).toFixed(2)} (${price.quantityAvailable} available)`);
    }

    console.log('\n🎉 Seed completed successfully!');
    console.log('\n📊 Summary:');
    console.log(`   Service: Whatsapp (ID: ${serviceId})`);
    console.log(`   Country: Brazil (ID: ${countryId})`);
    console.log(`   Total options: ${prices.length}`);
    console.log(`   Recommended: Opção 2 (lowest price)`);

  } catch (error) {
    console.error('❌ Seed failed:', error);
    process.exit(1);
  } finally {
    await connection.end();
  }
}

seedPrices();
