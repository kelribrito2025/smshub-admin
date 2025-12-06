import { getDb } from './db';
import { prices, smsApis, services, countries } from '../drizzle/schema';
import { eq, and, isNotNull } from 'drizzle-orm';

export interface ServiceApiOption {
  apiId: number;
  apiName: string;
  serviceId: number;
  serviceName: string;
    serviceSmshubCode: string;
  countryId: number;
  countryName: string;
  price: number; // in cents
  available: number; // quantity available
  priority: number;
}

/**
 * Get available API options for a specific service and country
 * Returns list of APIs that have this service available with prices
 */
export async function getServiceApiOptions(
  serviceId: number,
  countryId: number
): Promise<ServiceApiOption[]> {
  const db = await getDb();
  if (!db) return [];

  const results = await db
    .select({
      price: prices,
      api: smsApis,
      service: services,
      country: countries,
    })
    .from(prices)
    .innerJoin(smsApis, eq(prices.apiId, smsApis.id))
    .innerJoin(services, eq(prices.serviceId, services.id))
    .innerJoin(countries, eq(prices.countryId, countries.id))
    .where(
      and(
        eq(prices.serviceId, serviceId),
        eq(prices.countryId, countryId),
        isNotNull(prices.apiId), // Only prices linked to an API
        eq(smsApis.active, true) // Only active APIs
      )
    )
    .orderBy(smsApis.priority); // Order by priority (lower number = higher priority)

  return results.map(r => ({
    apiId: r.api.id,
    apiName: r.api.name,
    serviceId: r.service.id,
    serviceName: r.service.name,
    serviceSmshubCode: r.service.smshubCode,
    countryId: r.country.id,
    countryName: r.country.name,
    price: r.price.ourPrice,
    available: r.price.quantityAvailable,
    priority: r.api.priority,
  }));
}

/**
 * Get all API options for a service across all countries
 * Useful for showing all available options in the store
 */
export async function getAllServiceApiOptions(
  serviceId: number
): Promise<ServiceApiOption[]> {
  const db = await getDb();
  if (!db) return [];

  const results = await db
    .select({
      price: prices,
      api: smsApis,
      service: services,
      country: countries,
    })
    .from(prices)
    .innerJoin(smsApis, eq(prices.apiId, smsApis.id))
    .innerJoin(services, eq(prices.serviceId, services.id))
    .innerJoin(countries, eq(prices.countryId, countries.id))
    .where(
      and(
        eq(prices.serviceId, serviceId),
        isNotNull(prices.apiId),
        eq(smsApis.active, true)
      )
    )
    .orderBy(smsApis.priority); // Order by priority (lower number = higher priority)

  return results.map(r => ({
    apiId: r.api.id,
    apiName: r.api.name,
    serviceId: r.service.id,
    serviceName: r.service.name,
    serviceSmshubCode: r.service.smshubCode,
    countryId: r.country.id,
    countryName: r.country.name,
    price: r.price.ourPrice,
    available: r.price.quantityAvailable,
    priority: r.api.priority,
  }));
}
