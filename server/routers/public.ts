import { z } from 'zod';
import { router } from '../_core/trpc';
import { publicApiProcedure } from '../public-api-middleware';
import {
  getAllCountries,
  getAllServices,
  getAllPrices,
  getPriceByCountryAndService,
  getCountryById,
  getServiceById,
  getSetting,
} from '../db-helpers';
import { getCustomerById, getCustomerByEmail, getCustomerByPin, createCustomer, addBalance } from '../customers-helpers';
import {
  createActivation,
  getActivationById,
  updateActivation,
} from '../activations-helpers';
import { SMSHubClient } from '../smshub-client';

export const publicRouter = router({
  /**
   * Get all active countries
   * Returns list of countries available for purchase
   */
  getCountries: publicApiProcedure.query(async () => {
    const countries = await getAllCountries(true); // Only active countries

    return countries.map((country) => ({
      id: country.id,
      name: country.name,
      code: country.code,
      smshubId: country.smshubId,
    }));
  }),

  /**
   * Get all active services
   * Returns list of services available for purchase
   */
  getServices: publicApiProcedure
    .input(
      z
        .object({
          category: z.string().optional(),
        })
        .optional()
    )
    .query(async ({ input }) => {
      const services = await getAllServices(true); // Only active services

      // Filter by category if provided
      let filtered = services;
      if (input?.category) {
        filtered = services.filter((s) => s.category === input.category);
      }

      return filtered.map((service) => ({
        id: service.id,
        name: service.name,
        code: service.smshubCode,
        category: service.category,
      }));
    }),

  /**
   * Get all available prices
   * Returns prices for all active country/service combinations
   */
  getPrices: publicApiProcedure
    .input(
      z
        .object({
          countryId: z.number().optional(),
          serviceId: z.number().optional(),
        })
        .optional()
    )
    .query(async ({ input }) => {
      const allPrices = await getAllPrices();

      // Filter only active countries and services
      let filtered = allPrices.filter(
        (p) => p.country?.active && p.service?.active
      );

      // Apply filters if provided
      if (input?.countryId) {
        filtered = filtered.filter((p) => p.price?.countryId === input.countryId);
      }

      if (input?.serviceId) {
        filtered = filtered.filter((p) => p.price?.serviceId === input.serviceId);
      }

      return filtered.map((item) => ({
        countryId: item.price?.countryId,
        countryName: item.country?.name,
        countryCode: item.country?.code,
        serviceId: item.price?.serviceId,
        serviceName: item.service?.name,
        serviceCode: item.service?.smshubCode,
        serviceCategory: item.service?.category,
        price: item.price?.ourPrice, // Price in cents
        available: item.price?.quantityAvailable || 0,
        lastSync: item.price?.lastSync,
      }));
    }),

  /**
   * Get specific price for a country/service combination
   */
  getPrice: publicApiProcedure
    .input(
      z.object({
        countryId: z.number(),
        serviceId: z.number(),
      })
    )
    .query(async ({ input }) => {
      const result = await getPriceByCountryAndService(
        input.countryId,
        input.serviceId
      );

      if (!result || !result.price) {
        throw new Error('Price not found for this combination');
      }

      // Check if country and service are active
      if (!result.country?.active || !result.service?.active) {
        throw new Error('This service or country is not available');
      }

      return {
        countryId: result.price.countryId,
        countryName: result.country.name,
        countryCode: result.country.code,
        serviceId: result.price.serviceId,
        serviceName: result.service.name,
        serviceCode: result.service.smshubCode,
        serviceCategory: result.service.category,
        price: result.price.ourPrice, // Price in cents
        available: result.price.quantityAvailable || 0,
        lastSync: result.price.lastSync,
      };
    }),

  /**
   * Get service categories
   * Returns unique list of service categories
   */
  getCategories: publicApiProcedure.query(async () => {
    const services = await getAllServices(true);

    const categories = Array.from(
      new Set(services.map((s) => s.category).filter(Boolean))
    ).sort();

    return categories.map((category) => ({
      name: category,
      count: services.filter((s) => s.category === category).length,
    }));
  }),

  /**
   * Create a new activation (request SMS number)
   * Automatically debits customer balance if customerId is provided
   */
  createActivation: publicApiProcedure
    .input(z.object({
      countryId: z.number(),
      serviceId: z.number(),
      customerId: z.number(),
    }))
    .mutation(async ({ input }) => {      // Get API key from settings
      const apiKeySetting = await getSetting('smshub_api_key');
      if (!apiKeySetting || !apiKeySetting.value) {
        throw new Error('SMSHub API key not configured');
      }

      // Verify country and service exist and are active
      const country = await getCountryById(input.countryId);
      const service = await getServiceById(input.serviceId);

      if (!country || !country.active) {
        throw new Error('Country not available');
      }

      if (!service || !service.active) {
        throw new Error('Service not available');
      }

      // Get price
      const priceData = await getPriceByCountryAndService(input.countryId, input.serviceId);
      if (!priceData || !priceData.price) {
        throw new Error('Price not found');
      }

      // Check availability
      if (priceData.price.quantityAvailable <= 0) {
        throw new Error('No numbers available for this service');
      }

      // Validate customer and balance
      const customer = await getCustomerById(input.customerId);
      if (!customer) {
        throw new Error('Customer not found');
      }

      if (!customer.active) {
        throw new Error('Customer account is inactive');
      }

      if (customer.balance < priceData.price.ourPrice) {
        throw new Error(`Insufficient balance. Required: R$ ${(priceData.price.ourPrice / 100).toFixed(2)}, Available: R$ ${(customer.balance / 100).toFixed(2)}`);
      }

      // Request number from SMSHub
      const client = new SMSHubClient(apiKeySetting.value);
      const activation = await client.getNumber(service.smshubCode, country.smshubId);

      // Save activation to database
      const profit = priceData.price.ourPrice - priceData.price.smshubPrice;
      const newActivation = await createActivation({
        countryId: input.countryId,
        serviceId: input.serviceId,
        userId: input.customerId,
        smshubActivationId: activation.activationId.toString(),
        phoneNumber: activation.phoneNumber,
        status: 'active',
        smshubCost: priceData.price.smshubPrice,
        sellingPrice: priceData.price.ourPrice,
        profit: profit,
      });

      // Debit customer balance and create transaction
      if (!newActivation) {
        throw new Error('Failed to create activation record');
      }
      
      await addBalance(
        input.customerId,
        -priceData.price.ourPrice,
        'purchase',
        `SMS number purchase - ${service.name} (${country.name})`,
        undefined,
        newActivation.id
      );

      return {
        activationId: activation.activationId,
        phoneNumber: activation.phoneNumber,
        price: priceData.price.ourPrice,
        status: 'active',
      };
    }),

  /**
   * Get activation status and SMS code
   */
  getActivation: publicApiProcedure
    .input(z.object({ activationId: z.number() }))
    .query(async ({ input }) => {
      // Get activation from database
      const activation = await getActivationById(input.activationId);

      if (!activation) {
        throw new Error('Activation not found');
      }

      // If already completed or cancelled, return from database
      if (activation.status === 'completed' || activation.status === 'cancelled' || activation.status === 'failed') {
        return {
          activationId: activation.id,
          phoneNumber: activation.phoneNumber,
          status: activation.status,
          smsCode: activation.smsCode,
          price: activation.sellingPrice,
        };
      }

      // Check status from SMSHub
      const apiKeySetting = await getSetting('smshub_api_key');
      if (!apiKeySetting || !apiKeySetting.value) {
        throw new Error('SMSHub API key not configured');
      }

      const client = new SMSHubClient(apiKeySetting.value);
      const status = await client.getStatus(activation.smshubActivationId || '');

      // Update activation if status changed
      if (status.status === 'received' && status.code) {
        await updateActivation(activation.id, {
          status: 'completed',
          smsCode: status.code,
          completedAt: new Date(),
        });

        return {
          activationId: activation.id,
          phoneNumber: activation.phoneNumber,
          status: 'completed',
          smsCode: status.code,
          price: activation.sellingPrice,
        };
      } else if (status.status === 'cancelled') {
        await updateActivation(activation.id, {
          status: 'cancelled',
        });
      }

      return {
        activationId: activation.id,
        phoneNumber: activation.phoneNumber,
        status: activation.status,
        smsCode: activation.smsCode,
        price: activation.sellingPrice,
      };
    }),

  /**
   * Cancel activation
   */
  cancelActivation: publicApiProcedure
    .input(z.object({ activationId: z.number() }))
    .mutation(async ({ input }) => {
      // Get activation from database
      const activation = await getActivationById(input.activationId);

      if (!activation) {
        throw new Error('Activation not found');
      }

      // Can only cancel active or pending activations
      if (activation.status !== 'active' && activation.status !== 'pending') {
        throw new Error('Can only cancel active or pending activations');
      }

      // Cancel on SMSHub
      const apiKeySetting = await getSetting('smshub_api_key');
      if (!apiKeySetting || !apiKeySetting.value) {
        throw new Error('SMSHub API key not configured');
      }

      const client = new SMSHubClient(apiKeySetting.value);
      await client.setStatus(activation.smshubActivationId || '', 8); // 8 = cancel

      // Update in database
      await updateActivation(activation.id, {
        status: 'cancelled',
      });

      return {
        success: true,
        activationId: activation.id,
        status: 'cancelled',
      };
    }),

  /**
   * Get customer by email
   * Used for login in sales panel
   */
  getCustomerByEmail: publicApiProcedure
    .input(z.object({ email: z.string().email() }))
    .query(async ({ input }) => {
      const customer = await getCustomerByEmail(input.email);
      if (!customer) {
        throw new Error('Customer not found');
      }

      return {
        id: customer.id,
        pin: customer.pin,
        name: customer.name,
        email: customer.email,
        balance: customer.balance, // in cents
        active: customer.active,
        createdAt: customer.createdAt,
      };
    }),

  /**
   * Get customer by PIN
   * Used for quick customer lookup
   */
  getCustomerByPin: publicApiProcedure
    .input(z.object({ pin: z.number().int().positive() }))
    .query(async ({ input }) => {
      const customer = await getCustomerByPin(input.pin);
      if (!customer) {
        throw new Error('Customer not found');
      }

      return {
        id: customer.id,
        pin: customer.pin,
        name: customer.name,
        email: customer.email,
        balance: customer.balance, // in cents
        active: customer.active,
        createdAt: customer.createdAt,
      };
    }),

  /**
   * Get customer by ID
   * Returns customer information including balance
   */
  getCustomerById: publicApiProcedure
    .input(z.object({ customerId: z.number() }))
    .query(async ({ input }) => {
      const customer = await getCustomerById(input.customerId);

      if (!customer) {
        throw new Error('Customer not found');
      }

      if (!customer.active) {
        throw new Error('Customer account is inactive');
      }

      return {
        id: customer.id,
        name: customer.name,
        email: customer.email,
        balance: customer.balance, // in cents
        active: customer.active,
        createdAt: customer.createdAt,
      };
    }),

  /**
   * Create new customer
   * Used for registration in sales panel
   */
  createCustomer: publicApiProcedure
    .input(
      z.object({
        name: z.string().min(1),
        email: z.string().email(),
        initialBalance: z.number().min(0).optional(),
      })
    )
    .mutation(async ({ input }) => {
      // Check if email already exists
      const existing = await getCustomerByEmail(input.email);
      if (existing) {
        throw new Error('Email already registered');
      }

      // Create customer
      const customer = await createCustomer({
        name: input.name,
        email: input.email,
        balance: input.initialBalance || 0,
        active: true,
      });

      return {
        success: true,
        customerId: customer.id,
        name: customer.name,
        email: customer.email,
        balance: customer.balance,
      };
    }),
});
