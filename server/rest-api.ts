import { Router, Request, Response } from 'express';
import {
  getAllCountries,
  getAllServices,
  getAllPrices,
  getPriceByCountryAndService,
  getCountryById,
  getServiceById,
  getSetting,
} from './db-helpers';
import {
  getCustomerById,
  getCustomerByEmail,
  getCustomerByPin,
  createCustomer,
  addBalance,
} from './customers-helpers';
import { sendWelcomeEmail, sendActivationEmail } from './mailchimp-email';
import {
  createActivation,
  getActivationById,
  updateActivation,
} from './activations-helpers';
import { SMSHubClient } from './smshub-client';

const router = Router();

/**
 * Middleware to validate API Key
 */
async function validateApiKey(req: Request, res: Response, next: Function) {
  const apiKey = req.headers['x-api-key'] as string;

  if (!apiKey) {
    return res.status(401).json({
      error: 'API key is required',
      message: 'Please provide X-API-Key header',
    });
  }

  // Import API key validation
  const { getDb } = await import('./db');
  const { apiKeys } = await import('../drizzle/schema');
  const { eq } = await import('drizzle-orm');

  const db = await getDb();
  if (!db) {
    return res.status(500).json({
      error: 'Database not available',
    });
  }

  const [key] = await db.select().from(apiKeys).where(eq(apiKeys.key, apiKey)).limit(1);

  if (!key || !key.active) {
    return res.status(403).json({
      error: 'Invalid or inactive API key',
    });
  }

  next();
}

// Apply API key validation to all routes
router.use(validateApiKey);

/**
 * GET /api/public/services
 * Get all active services
 */
router.get('/services', async (req: Request, res: Response) => {
  try {
    const category = req.query.category as string | undefined;
    const services = await getAllServices(true); // Only active services

    // Filter by category if provided
    let filtered = services;
    if (category) {
      filtered = services.filter((s) => s.category === category);
    }

    const result = filtered.map((service) => ({
      id: service.id,
      name: service.name,
      code: service.smshubCode,
      category: service.category,
    }));

    res.json(result);
  } catch (error: any) {
    res.status(500).json({
      error: 'Failed to fetch services',
      message: error.message,
    });
  }
});

/**
 * GET /api/public/countries
 * Get all active countries
 */
router.get('/countries', async (req: Request, res: Response) => {
  try {
    const countries = await getAllCountries(true); // Only active countries

    const result = countries.map((country) => ({
      id: country.id,
      name: country.name,
      code: country.code,
      smshubId: country.smshubId,
    }));

    res.json(result);
  } catch (error: any) {
    res.status(500).json({
      error: 'Failed to fetch countries',
      message: error.message,
    });
  }
});

/**
 * GET /api/public/prices
 * Get all available prices
 */
router.get('/prices', async (req: Request, res: Response) => {
  try {
    const countryId = req.query.countryId ? parseInt(req.query.countryId as string) : undefined;
    const serviceId = req.query.serviceId ? parseInt(req.query.serviceId as string) : undefined;

    const allPrices = await getAllPrices();

    // Filter only active countries and services
    let filtered = allPrices.filter(
      (p) => p.country?.active && p.service?.active
    );

    // Apply filters if provided
    if (countryId) {
      filtered = filtered.filter((p) => p.price?.countryId === countryId);
    }

    if (serviceId) {
      filtered = filtered.filter((p) => p.price?.serviceId === serviceId);
    }

    const result = filtered.map((item) => ({
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

    res.json(result);
  } catch (error: any) {
    res.status(500).json({
      error: 'Failed to fetch prices',
      message: error.message,
    });
  }
});

/**
 * GET /api/public/categories
 * Get service categories
 */
router.get('/categories', async (req: Request, res: Response) => {
  try {
    const services = await getAllServices(true);

    const categories = Array.from(
      new Set(services.map((s) => s.category).filter(Boolean))
    ).sort();

    const result = categories.map((category) => ({
      name: category,
      count: services.filter((s) => s.category === category).length,
    }));

    res.json(result);
  } catch (error: any) {
    res.status(500).json({
      error: 'Failed to fetch categories',
      message: error.message,
    });
  }
});

/**
 * POST /api/public/activations
 * Create a new activation (request SMS number)
 */
router.post('/activations', async (req: Request, res: Response) => {
  try {
    const { countryId, serviceId, customerId } = req.body;

    if (!countryId || !serviceId || !customerId) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'countryId, serviceId, and customerId are required',
      });
    }

    // Get API key from settings
    const apiKeySetting = await getSetting('smshub_api_key');
    if (!apiKeySetting || !apiKeySetting.value) {
      return res.status(500).json({
        error: 'SMSHub API key not configured',
      });
    }

    // Verify country and service exist and are active
    const country = await getCountryById(countryId);
    const service = await getServiceById(serviceId);

    if (!country || !country.active) {
      return res.status(400).json({
        error: 'Country not available',
      });
    }

    if (!service || !service.active) {
      return res.status(400).json({
        error: 'Service not available',
      });
    }

    // Get price
    const priceData = await getPriceByCountryAndService(countryId, serviceId);
    if (!priceData || !priceData.price) {
      return res.status(400).json({
        error: 'Price not found',
      });
    }

    // Check availability
    if (priceData.price.quantityAvailable <= 0) {
      return res.status(400).json({
        error: 'No numbers available for this service',
      });
    }

    // Validate customer and balance
    const customer = await getCustomerById(customerId);
    if (!customer) {
      return res.status(404).json({
        error: 'Customer not found',
      });
    }

    if (!customer.active) {
      return res.status(403).json({
        error: 'Customer account is inactive',
      });
    }

    if (customer.balance < priceData.price.ourPrice) {
      return res.status(402).json({
        error: 'Insufficient balance',
        message: `Required: R$ ${(priceData.price.ourPrice / 100).toFixed(2)}, Available: R$ ${(customer.balance / 100).toFixed(2)}`,
      });
    }

    // Request number from SMSHub
    const client = new SMSHubClient(apiKeySetting.value);
    const activation = await client.getNumber(service.smshubCode, country.smshubId);

    // Save activation to database
    const profit = priceData.price.ourPrice - priceData.price.smshubPrice;
    const newActivation = await createActivation({
      countryId: countryId,
      serviceId: serviceId,
      userId: customerId,
      smshubActivationId: activation.activationId.toString(),
      phoneNumber: activation.phoneNumber,
      status: 'active',
      smshubCost: priceData.price.smshubPrice,
      sellingPrice: priceData.price.ourPrice,
      profit: profit,
    });

    // Debit customer balance and create transaction
    if (!newActivation) {
      return res.status(500).json({
        error: 'Failed to create activation record',
      });
    }

    await addBalance(
      customerId,
      -priceData.price.ourPrice,
      'purchase',
      `SMS number purchase - ${service.name} (${country.name})`,
      undefined,
      newActivation.id
    );

    res.json({
      activationId: newActivation.id,
      phoneNumber: activation.phoneNumber,
      price: priceData.price.ourPrice,
      status: 'active',
    });
  } catch (error: any) {
    res.status(500).json({
      error: 'Failed to create activation',
      message: error.message,
    });
  }
});

/**
 * GET /api/public/activations/:id
 * Get activation status and SMS code
 */
router.get('/activations/:id', async (req: Request, res: Response) => {
  try {
    const activationId = parseInt(req.params.id);

    if (isNaN(activationId)) {
      return res.status(400).json({
        error: 'Invalid activation ID',
      });
    }

    // Get activation from database
    const activation = await getActivationById(activationId);

    if (!activation) {
      return res.status(404).json({
        error: 'Activation not found',
      });
    }

    // If already completed or cancelled, return from database
    if (
      activation.status === 'completed' ||
      activation.status === 'cancelled' ||
      activation.status === 'failed'
    ) {
      return res.json({
        activationId: activation.id,
        phoneNumber: activation.phoneNumber,
        status: activation.status,
        smsCode: activation.smsCode,
        price: activation.sellingPrice,
      });
    }

    // Check status from SMSHub
    const apiKeySetting = await getSetting('smshub_api_key');
    if (!apiKeySetting || !apiKeySetting.value) {
      return res.status(500).json({
        error: 'SMSHub API key not configured',
      });
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

      return res.json({
        activationId: activation.id,
        phoneNumber: activation.phoneNumber,
        status: 'completed',
        smsCode: status.code,
        price: activation.sellingPrice,
      });
    } else if (status.status === 'cancelled') {
      await updateActivation(activation.id, {
        status: 'cancelled',
      });
    }

    res.json({
      activationId: activation.id,
      phoneNumber: activation.phoneNumber,
      status: activation.status,
      smsCode: activation.smsCode,
      price: activation.sellingPrice,
    });
  } catch (error: any) {
    res.status(500).json({
      error: 'Failed to get activation status',
      message: error.message,
    });
  }
});

/**
 * POST /api/public/activations/:id/cancel
 * Cancel activation
 */
router.post('/activations/:id/cancel', async (req: Request, res: Response) => {
  try {
    const activationId = parseInt(req.params.id);

    if (isNaN(activationId)) {
      return res.status(400).json({
        error: 'Invalid activation ID',
      });
    }

    // Get activation from database
    const activation = await getActivationById(activationId);

    if (!activation) {
      return res.status(404).json({
        error: 'Activation not found',
      });
    }

    if (activation.status !== 'active') {
      return res.status(400).json({
        error: 'Can only cancel active activations',
      });
    }

    // Cancel on SMSHub
    const apiKeySetting = await getSetting('smshub_api_key');
    if (!apiKeySetting || !apiKeySetting.value) {
      return res.status(500).json({
        error: 'SMSHub API key not configured',
      });
    }

    const client = new SMSHubClient(apiKeySetting.value);
    await client.setStatus(activation.smshubActivationId || '', 8); // 8 = cancel

    // Update in database
    await updateActivation(activation.id, {
      status: 'cancelled',
    });

    res.json({
      success: true,
      message: 'Activation cancelled successfully',
    });
  } catch (error: any) {
    res.status(500).json({
      error: 'Failed to cancel activation',
      message: error.message,
    });
  }
});

/**
 * GET /api/public/customers/by-email
 * Get customer by email
 */
router.get('/customers/by-email', async (req: Request, res: Response) => {
  try {
    const email = req.query.email as string;

    if (!email) {
      return res.status(400).json({
        error: 'Email is required',
      });
    }

    const customer = await getCustomerByEmail(email);

    if (!customer) {
      return res.status(404).json({
        error: 'Customer not found',
      });
    }

    res.json({
      id: customer.id,
      pin: customer.pin,
      name: customer.name,
      email: customer.email,
      balance: customer.balance,
      active: customer.active,
      createdAt: customer.createdAt,
    });
  } catch (error: any) {
    res.status(500).json({
      error: 'Failed to fetch customer',
      message: error.message,
    });
  }
});

/**
 * GET /api/public/customers/by-pin
 * Get customer by PIN
 */
router.get('/customers/by-pin', async (req: Request, res: Response) => {
  try {
    const pin = req.query.pin as string;

    if (!pin) {
      return res.status(400).json({
        error: 'PIN is required',
      });
    }

    const pinNumber = parseInt(pin);
    if (isNaN(pinNumber)) {
      return res.status(400).json({
        error: 'Invalid PIN format',
      });
    }

    const customer = await getCustomerByPin(pinNumber);

    if (!customer) {
      return res.status(404).json({
        error: 'Customer not found',
      });
    }

    res.json({
      id: customer.id,
      pin: customer.pin,
      name: customer.name,
      email: customer.email,
      balance: customer.balance,
      active: customer.active,
      createdAt: customer.createdAt,
    });
  } catch (error: any) {
    res.status(500).json({
      error: 'Failed to fetch customer',
      message: error.message,
    });
  }
});

/**
 * POST /api/public/customers
 * Create a new customer
 */
router.post('/customers', async (req: Request, res: Response) => {
  try {
    const { email, name } = req.body;

    if (!email) {
      return res.status(400).json({
        error: 'Email is required',
      });
    }

    // Check if customer already exists
    const existing = await getCustomerByEmail(email);
    if (existing) {
      return res.status(409).json({
        error: 'Customer with this email already exists',
        customer: {
          id: existing.id,
          pin: existing.pin,
          name: existing.name,
          email: existing.email,
          balance: existing.balance,
          active: existing.active,
          createdAt: existing.createdAt,
        },
      });
    }

    const customer = await createCustomer({
      email,
      name: name || 'Indefinido',
      balance: 0,
      active: true,
    });

    // Enviar email de ativação (não bloquear resposta se falhar)
    sendActivationEmail(customer.email, customer.name, customer.id).catch(error => {
      console.error('[REST API] Failed to send activation email:', error);
    });

    // Enviar email de boas-vindas (não bloquear resposta se falhar)
    sendWelcomeEmail(customer.email, customer.name).catch(error => {
      console.error('[REST API] Failed to send welcome email:', error);
    });

    res.status(201).json({
      id: customer.id,
      pin: customer.pin,
      name: customer.name,
      email: customer.email,
      balance: customer.balance,
      active: customer.active,
      createdAt: customer.createdAt,
    });
  } catch (error: any) {
    res.status(500).json({
      error: 'Failed to create customer',
      message: error.message,
    });
  }
});

/**
 * GET /api/public/customers/:id
 * Get customer by ID
 */
router.get('/customers/:id', async (req: Request, res: Response) => {
  try {
    const customerId = parseInt(req.params.id);

    if (isNaN(customerId)) {
      return res.status(400).json({
        error: 'Invalid customer ID',
      });
    }

    const customer = await getCustomerById(customerId);

    if (!customer) {
      return res.status(404).json({
        error: 'Customer not found',
      });
    }

    res.json({
      id: customer.id,
      pin: customer.pin,
      name: customer.name,
      email: customer.email,
      balance: customer.balance,
      active: customer.active,
      createdAt: customer.createdAt,
    });
  } catch (error: any) {
    res.status(500).json({
      error: 'Failed to fetch customer',
      message: error.message,
    });
  }
});

export default router;
