import { eq, and, desc, isNull, sql, asc } from 'drizzle-orm';;
import { getDb } from './db';
import {
  settings,
  countries,
  services,
  operators,
  prices,
  activations,
  priceHistory,
  customerFavorites,
  smsApis,
  smsMessages,
  InsertSetting,
  InsertCountry,
  InsertService,
  InsertOperator,
  InsertPrice,
  InsertActivation,
  InsertPriceHistory,
  InsertCustomerFavorite,
  InsertSmsMessage,
} from '../drizzle/schema';

// ============ Settings ============

export async function getSetting(key: string) {
  const db = await getDb();
  if (!db) return null;

  const result = await db.select().from(settings).where(eq(settings.key, key)).limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function upsertSetting(data: InsertSetting) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  await db
    .insert(settings)
    .values(data)
    .onDuplicateKeyUpdate({
      set: { value: data.value, updatedAt: new Date() },
    });
}

export async function getAllSettings() {
  const db = await getDb();
  if (!db) return [];

  return db.select().from(settings);
}

// ============ Countries ============

export async function getCountryById(id: number) {
  const db = await getDb();
  if (!db) return null;

  const result = await db.select().from(countries).where(eq(countries.id, id)).limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function getCountryBySmshubId(smshubId: number) {
  const db = await getDb();
  if (!db) return null;

  const result = await db.select().from(countries).where(eq(countries.smshubId, smshubId)).limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function getAllCountries(activeOnly: boolean = false) {
  const db = await getDb();
  if (!db) return [];

  if (activeOnly) {
    return db.select().from(countries).where(eq(countries.active, true));
  }

  return db.select().from(countries);
}

export async function upsertCountry(data: InsertCountry) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  await db
    .insert(countries)
    .values(data)
    .onDuplicateKeyUpdate({
      set: {
        name: data.name,
        code: data.code,
        updatedAt: new Date(),
      },
    });
}

export async function updateCountry(id: number, data: Partial<InsertCountry>) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  await db.update(countries).set({ ...data, updatedAt: new Date() }).where(eq(countries.id, id));
}

export async function deleteCountry(id: number) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  await db.delete(countries).where(eq(countries.id, id));
}

// ============ Services ============

export async function getServiceById(id: number) {
  const db = await getDb();
  if (!db) return null;

  const result = await db.select().from(services).where(eq(services.id, id)).limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function getServiceByCode(smshubCode: string) {
  const db = await getDb();
  if (!db) return null;

  const result = await db.select().from(services).where(eq(services.smshubCode, smshubCode)).limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function getAllServices(activeOnly: boolean = false) {
  const db = await getDb();
  if (!db) return [];

  // Buscar top 20 serviços mais vendidos
  const top20Query = db
    .select()
    .from(services)
    .where(activeOnly ? eq(services.active, true) : sql`1=1`)
    .orderBy(desc(services.totalSales), asc(services.name))
    .limit(20);
  
  const top20 = await top20Query;
  const top20Ids = top20.map(s => s.id);
  
  // Buscar os demais serviços em ordem alfabética (excluindo os top 20)
  const restQuery = db
    .select()
    .from(services)
    .where(
      and(
        activeOnly ? eq(services.active, true) : sql`1=1`,
        top20Ids.length > 0 ? sql`${services.id} NOT IN (${sql.join(top20Ids.map(id => sql`${id}`), sql`, `)})` : sql`1=1`
      )
    )
    .orderBy(asc(services.name));
  
  const rest = await restQuery;
  
  // Combinar: top 20 primeiro, depois o resto
  return [...top20, ...rest];
}

export async function upsertService(data: InsertService) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  await db
    .insert(services)
    .values(data)
    .onDuplicateKeyUpdate({
      set: {
        name: data.name,
        category: data.category,
        updatedAt: new Date(),
      },
    });
}

export async function createService(data: InsertService) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  // Check if service with this code already exists
  const existing = await getServiceByCode(data.smshubCode);
  if (existing) {
    return existing;
  }

  // Insert new service
  const result = await db.insert(services).values(data);
  const insertId = Number(result[0].insertId);
  
  // Return the created service
  const created = await getServiceById(insertId);
  if (!created) throw new Error('Failed to create service');
  
  return created;
}

export async function updateService(id: number, data: Partial<InsertService>) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  await db.update(services).set({ ...data, updatedAt: new Date() }).where(eq(services.id, id));
}

export async function deleteService(id: number) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  await db.delete(services).where(eq(services.id, id));
}

// ============ Operators ============

export async function getOperatorsByCountry(countryId: number) {
  const db = await getDb();
  if (!db) return [];

  return db.select().from(operators).where(eq(operators.countryId, countryId));
}

export async function upsertOperator(data: InsertOperator) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  // Check if exists
  const existing = await db
    .select()
    .from(operators)
    .where(and(eq(operators.countryId, data.countryId), eq(operators.code, data.code)))
    .limit(1);

  if (existing.length > 0) {
    await db
      .update(operators)
      .set({ name: data.name })
      .where(eq(operators.id, existing[0].id));
  } else {
    await db.insert(operators).values(data);
  }
}

// ============ Prices ============

export async function getPriceByCountryAndService(countryId: number, serviceId: number) {
  const db = await getDb();
  if (!db) return null;

  const result = await db
    .select({
      price: prices,
      country: countries,
      service: services,
    })
    .from(prices)
    .leftJoin(countries, eq(prices.countryId, countries.id))
    .leftJoin(services, eq(prices.serviceId, services.id))
    .where(and(eq(prices.countryId, countryId), eq(prices.serviceId, serviceId)))
    .limit(1);

  return result.length > 0 ? result[0] : null;
}

export async function getPriceByCountryServiceAndApi(countryId: number, serviceId: number, apiId: number) {
  const db = await getDb();
  if (!db) return null;

  const result = await db
    .select({
      price: prices,
      country: countries,
      service: services,
      api: smsApis,
    })
    .from(prices)
    .leftJoin(countries, eq(prices.countryId, countries.id))
    .leftJoin(services, eq(prices.serviceId, services.id))
    .leftJoin(smsApis, eq(prices.apiId, smsApis.id))
    .where(and(
      eq(prices.countryId, countryId), 
      eq(prices.serviceId, serviceId),
      eq(prices.apiId, apiId)
    ))
    .limit(1);

  return result.length > 0 ? result[0] : null;
}

export async function getAllPrices() {
  const db = await getDb();
  if (!db) return [];

  return db
    .select({
      price: prices,
      country: countries,
      service: services,
      api: smsApis,
    })
    .from(prices)
    .leftJoin(countries, eq(prices.countryId, countries.id))
    .leftJoin(services, eq(prices.serviceId, services.id))
    .leftJoin(smsApis, eq(prices.apiId, smsApis.id))
    .orderBy(asc(services.name), asc(smsApis.priority));
}

export async function upsertPrice(data: InsertPrice) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  // Check if price changed
  const existing = await getPriceByCountryAndService(data.countryId, data.serviceId);

  if (existing && existing.price && (existing.price.smshubPrice !== data.smshubPrice || existing.price.ourPrice !== data.ourPrice)) {
    // Log price change to history
    await db.insert(priceHistory).values({
      countryId: data.countryId,
      serviceId: data.serviceId,
      smshubPrice: data.smshubPrice,
      ourPrice: data.ourPrice,
    });
  }

  await db
    .insert(prices)
    .values(data)
    .onDuplicateKeyUpdate({
      set: {
        smshubPrice: data.smshubPrice,
        ourPrice: data.ourPrice,
        quantityAvailable: data.quantityAvailable,
        lastSync: new Date(),
      },
    });
}

export async function getPricesByCountry(countryId: number) {
  const db = await getDb();
  if (!db) return [];

  return db
    .select({
      price: prices,
      service: services,
    })
    .from(prices)
    .leftJoin(services, eq(prices.serviceId, services.id))
    .where(eq(prices.countryId, countryId));
}

export async function getPricesByService(serviceId: number) {
  const db = await getDb();
  if (!db) return [];

  return db
    .select({
      price: prices,
      country: countries,
    })
    .from(prices)
    .leftJoin(countries, eq(prices.countryId, countries.id))
    .where(eq(prices.serviceId, serviceId));
}

export async function updatePrice(id: number, data: Partial<InsertPrice>) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  await db.update(prices).set(data).where(eq(prices.id, id));
}

export async function deletePrice(id: number) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  await db.delete(prices).where(eq(prices.id, id));
}

// ============ Activations ============

export async function createActivation(data: InsertActivation) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  const result = await db.insert(activations).values(data);
  
  // Return the created activation
  // Drizzle returns insertId in the result array for MySQL
  const insertId = Array.isArray(result) && result.length > 0 
    ? Number(result[0]?.insertId || (result as any).insertId)
    : Number((result as any).insertId);
  
  if (!insertId || isNaN(insertId)) {
    console.error('[createActivation] Invalid insertId:', result);
    throw new Error('Failed to get activation ID from database');
  }
  
  // NÃO incrementar totalSales aqui - será incrementado apenas quando status = 'completed'
  
  const created = await getActivationById(insertId);
  if (!created) throw new Error('Failed to create activation');
  
  return created.activation;
}

export async function getActivationById(id: number) {
  const db = await getDb();
  if (!db) return null;

  const result = await db
    .select({
      activation: activations,
      service: services,
      country: countries,
    })
    .from(activations)
    .leftJoin(services, eq(activations.serviceId, services.id))
    .leftJoin(countries, eq(activations.countryId, countries.id))
    .where(eq(activations.id, id))
    .limit(1);

  return result.length > 0 ? result[0] : null;
}

export async function getActivationBySmshubId(smshubActivationId: string) {
  const db = await getDb();
  if (!db) return null;

  const result = await db
    .select()
    .from(activations)
    .where(eq(activations.smshubActivationId, smshubActivationId))
    .limit(1);

  return result.length > 0 ? result[0] : null;
}

export async function updateActivation(id: number, data: Partial<InsertActivation>) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  // Se o status está sendo atualizado para 'completed', incrementar totalSales
  if (data.status === 'completed') {
    const activation = await getActivationById(id);
    if (activation && activation.activation.serviceId && activation.activation.status !== 'completed') {
      // Incrementar apenas se não estava completed antes (evitar duplicação)
      await db
        .update(services)
        .set({ totalSales: sql`${services.totalSales} + 1` })
        .where(eq(services.id, activation.activation.serviceId));
    }
  }

  await db.update(activations).set(data).where(eq(activations.id, id));
}

export async function getAllActivations(limit: number = 100) {
  const db = await getDb();
  if (!db) return [];

  return db
    .select({
      activation: activations,
      service: services,
      country: countries,
    })
    .from(activations)
    .leftJoin(services, eq(activations.serviceId, services.id))
    .leftJoin(countries, eq(activations.countryId, countries.id))
    .orderBy(desc(activations.createdAt))
    .limit(limit);
}

export async function getActivationsByUser(userId: number, limit: number = 50) {
  const db = await getDb();
  if (!db) return [];

  return db
    .select({
      activation: activations,
      service: services,
      country: countries,
    })
    .from(activations)
    .leftJoin(services, eq(activations.serviceId, services.id))
    .leftJoin(countries, eq(activations.countryId, countries.id))
    .where(eq(activations.userId, userId))
    .orderBy(desc(activations.createdAt))
    .limit(limit);
}

// ============ Statistics ============

export async function getActivationStats(startDate?: Date, endDate?: Date) {
  const db = await getDb();
  if (!db) return null;

  let query = db.select({
    total: sql<number>`COUNT(*)`,
    completed: sql<number>`SUM(CASE WHEN ${activations.status} = 'completed' THEN 1 ELSE 0 END)`,
    cancelled: sql<number>`SUM(CASE WHEN ${activations.status} = 'cancelled' THEN 1 ELSE 0 END)`,
    failed: sql<number>`SUM(CASE WHEN ${activations.status} = 'failed' THEN 1 ELSE 0 END)`,
    totalRevenue: sql<number>`SUM(${activations.sellingPrice})`,
    totalCost: sql<number>`SUM(${activations.smshubCost})`,
    totalProfit: sql<number>`SUM(${activations.profit})`,
  }).from(activations);

  if (startDate && endDate) {
    query = query.where(
      and(
        sql`${activations.createdAt} >= ${startDate}`,
        sql`${activations.createdAt} <= ${endDate}`
      )
    ) as any;
  }

  const result = await query;
  return result.length > 0 ? result[0] : null;
}

export async function getTopServices(limit: number = 10) {
  const db = await getDb();
  if (!db) return [];

  return db
    .select({
      service: services,
      count: sql<number>`COUNT(*)`,
      revenue: sql<number>`SUM(${activations.sellingPrice})`,
      profit: sql<number>`SUM(${activations.profit})`,
    })
    .from(activations)
    .leftJoin(services, eq(activations.serviceId, services.id))
    .where(eq(activations.status, 'completed'))
    .groupBy(services.id)
    .orderBy(desc(sql`COUNT(*)`))
    .limit(limit);
}

export async function getTopCountries(limit: number = 10) {
  const db = await getDb();
  if (!db) return [];

  return db
    .select({
      country: countries,
      count: sql<number>`COUNT(*)`,
      revenue: sql<number>`SUM(${activations.sellingPrice})`,
      profit: sql<number>`SUM(${activations.profit})`,
    })
    .from(activations)
    .leftJoin(countries, eq(activations.countryId, countries.id))
    .where(eq(activations.status, 'completed'))
    .groupBy(countries.id)
    .orderBy(desc(sql`COUNT(*)`))
    .limit(limit);
}

// ============ Customer Favorites ============

export async function toggleFavorite(customerId: number, serviceId: number) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  // Check if favorite exists
  const existing = await db
    .select()
    .from(customerFavorites)
    .where(and(
      eq(customerFavorites.customerId, customerId),
      eq(customerFavorites.serviceId, serviceId)
    ))
    .limit(1);

  if (existing.length > 0) {
    // Remove favorite
    await db
      .delete(customerFavorites)
      .where(and(
        eq(customerFavorites.customerId, customerId),
        eq(customerFavorites.serviceId, serviceId)
      ));
    return { isFavorite: false };
  } else {
    // Add favorite
    await db.insert(customerFavorites).values({
      customerId,
      serviceId,
    });
    return { isFavorite: true };
  }
}

export async function getCustomerFavorites(customerId: number) {
  const db = await getDb();
  if (!db) return [];

  return db
    .select({
      id: customerFavorites.id,
      serviceId: customerFavorites.serviceId,
      service: services,
      createdAt: customerFavorites.createdAt,
    })
    .from(customerFavorites)
    .leftJoin(services, eq(customerFavorites.serviceId, services.id))
    .where(eq(customerFavorites.customerId, customerId));
}

export async function isFavorite(customerId: number, serviceId: number) {
  const db = await getDb();
  if (!db) return false;

  const result = await db
    .select()
    .from(customerFavorites)
    .where(and(
      eq(customerFavorites.customerId, customerId),
      eq(customerFavorites.serviceId, serviceId)
    ))
    .limit(1);

  return result.length > 0;
}

// ============ SMS APIs ============

export async function getApiById(id: number) {
  const db = await getDb();
  if (!db) return null;

  const result = await db.select().from(smsApis).where(eq(smsApis.id, id)).limit(1);
  return result.length > 0 ? result[0] : null;
}


// ============ SMS Messages ============

export async function createSmsMessage(data: InsertSmsMessage) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  const result = await db.insert(smsMessages).values(data);
  return result;
}

export async function getSmsMessagesByActivation(activationId: number) {
  const db = await getDb();
  if (!db) return [];

  return db
    .select()
    .from(smsMessages)
    .where(eq(smsMessages.activationId, activationId))
    .orderBy(asc(smsMessages.receivedAt));
}

export async function getActivationsWithSms(userId: number, limit: number = 50) {
  const db = await getDb();
  if (!db) return [];

  // Get activations with their services and countries
  const activationsData = await db
    .select({
      activation: activations,
      service: services,
      country: countries,
    })
    .from(activations)
    .leftJoin(services, eq(activations.serviceId, services.id))
    .leftJoin(countries, eq(activations.countryId, countries.id))
    .where(eq(activations.userId, userId))
    .orderBy(desc(activations.createdAt))
    .limit(limit);

  // For each activation, fetch its SMS messages
  const results = await Promise.all(
    activationsData.map(async (item) => {
      const smsData = await getSmsMessagesByActivation(item.activation.id);
      return {
        ...item,
        smsMessages: smsData,
      };
    })
  );

  return results;
}
