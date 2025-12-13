import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, boolean, index, uniqueIndex, decimal } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  permissions: text("permissions"), // JSON array of permissions (e.g., ["support:impersonate"])
  navLayout: mysqlEnum("navLayout", ["sidebar", "top"]).default("sidebar").notNull(), // Navigation layout preference
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * API Keys for external integrations (e.g., sales dashboard)
 */
export const apiKeys = mysqlTable("api_keys", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  key: varchar("key", { length: 64 }).notNull().unique(),
  active: int("active").default(1).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  lastUsedAt: timestamp("lastUsedAt"),
  expiresAt: timestamp("expiresAt"),
});

export type ApiKey = typeof apiKeys.$inferSelect;
export type InsertApiKey = typeof apiKeys.$inferInsert;

/**
 * Settings table - stores API keys and global configurations
 */
export const settings = mysqlTable("settings", {
  id: int("id").autoincrement().primaryKey(),
  key: varchar("key", { length: 100 }).notNull().unique(),
  value: text("value"),
  description: text("description"),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Setting = typeof settings.$inferSelect;
export type InsertSetting = typeof settings.$inferInsert;

/**
 * Countries table - stores available countries from SMSHub API
 */
export const countries = mysqlTable("countries", {
  id: int("id").autoincrement().primaryKey(),
  smshubId: int("smshubId").notNull().unique(), // ID from SMSHub API
  name: varchar("name", { length: 100 }).notNull(),
  code: varchar("code", { length: 50 }).notNull(), // e.g., "brazil", "usa"
  active: boolean("active").default(true).notNull(),
  markupPercentage: int("markupPercentage").default(0).notNull(), // Percentage markup (e.g., 20 for 20%)
  markupFixed: int("markupFixed").default(0).notNull(), // Fixed markup in cents
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  codeIdx: index("code_idx").on(table.code),
}));

export type Country = typeof countries.$inferSelect;
export type InsertCountry = typeof countries.$inferInsert;

/**
 * Operators table - stores mobile operators for each country
 */
export const operators = mysqlTable("operators", {
  id: int("id").autoincrement().primaryKey(),
  countryId: int("countryId").notNull(),
  code: varchar("code", { length: 50 }).notNull(), // e.g., "any", "vivo", "claro"
  name: varchar("name", { length: 100 }).notNull(),
  active: boolean("active").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  countryCodeIdx: uniqueIndex("country_code_idx").on(table.countryId, table.code),
}));

export type Operator = typeof operators.$inferSelect;
export type InsertOperator = typeof operators.$inferInsert;

/**
 * Services table - stores available services from SMSHub API
 */
export const services = mysqlTable("services", {
  id: int("id").autoincrement().primaryKey(),
  smshubCode: varchar("smshubCode", { length: 50 }).notNull().unique(), // e.g., "wa", "tg", "go"
  name: varchar("name", { length: 200 }).notNull(),
  category: varchar("category", { length: 100 }), // e.g., "Social", "Finance", "Shopping"
  active: boolean("active").default(true).notNull(),
  markupPercentage: int("markupPercentage").default(0).notNull(),
  markupFixed: int("markupFixed").default(0).notNull(),
  totalSales: int("totalSales").default(0).notNull(), // Total de vendas do serviço
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  categoryIdx: index("category_idx").on(table.category),
  totalSalesIdx: index("total_sales_idx").on(table.totalSales),
}));

export type Service = typeof services.$inferSelect;
export type InsertService = typeof services.$inferInsert;

/**
 * Prices table - stores current prices and availability from SMSHub
 */
export const prices = mysqlTable("prices", {
  id: int("id").autoincrement().primaryKey(),
  apiId: int("apiId").references(() => smsApis.id, { onDelete: 'cascade' }), // NULL for legacy data, links to sms_apis table
  countryId: int("countryId").notNull(),
  serviceId: int("serviceId").notNull(),
  smshubPrice: int("smshubPrice").notNull(), // Price in cents from SMSHub
  ourPrice: int("ourPrice").notNull(), // Our selling price in cents (with markup)
  fixedPrice: boolean("fixedPrice").default(false).notNull(), // If true, ourPrice won't be updated automatically
  quantityAvailable: int("quantityAvailable").default(0).notNull(),
  active: boolean("active").default(true).notNull(),
  lastSync: timestamp("lastSync").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  countryServiceApiIdx: uniqueIndex("country_service_api_idx").on(table.countryId, table.serviceId, table.apiId),
  apiIdx: index("api_idx").on(table.apiId),
  lastSyncIdx: index("last_sync_idx").on(table.lastSync),
}));

export type Price = typeof prices.$inferSelect;
export type InsertPrice = typeof prices.$inferInsert;

/**
 * Activations table - stores all SMS activation requests
 */
export const activations = mysqlTable("activations", {
  id: int("id").autoincrement().primaryKey(),
  smshubActivationId: varchar("smshubActivationId", { length: 50 }), // ID from SMSHub API
  apiId: int("apiId"), // Which API was used (1=API1, 2=API2, etc)
  userId: int("userId"), // Can be null for API requests without user context
  serviceId: int("serviceId").notNull(),
  countryId: int("countryId").notNull(),
  phoneNumber: varchar("phoneNumber", { length: 20 }),
  status: mysqlEnum("status", [
    "pending",      // Waiting for number
    "active",       // Number received, waiting for SMS
    "completed",    // SMS received and confirmed
    "cancelled",    // Activation cancelled
    "failed",       // Failed to get number or receive SMS
    "expired"       // Activation expired (>20min without SMS)
  ]).default("pending").notNull(),
  smshubStatus: varchar("smshubStatus", { length: 50 }), // Raw status from SMSHub API (e.g., "STATUS_WAIT_RETRY", "STATUS_OK")
  smsCode: varchar("smsCode", { length: 100 }), // The SMS verification code received
  smshubCost: int("smshubCost").default(0).notNull(), // Cost from SMSHub in cents
  sellingPrice: int("sellingPrice").default(0).notNull(), // Price charged to customer in cents
  profit: int("profit").default(0).notNull(), // Profit in cents
  externalOrderId: varchar("externalOrderId", { length: 100 }), // Order ID from external dashboard
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  completedAt: timestamp("completedAt"),
}, (table) => ({
  userIdIdx: index("user_id_idx").on(table.userId),
  statusIdx: index("status_idx").on(table.status),
  createdAtIdx: index("created_at_idx").on(table.createdAt),
  externalOrderIdx: index("external_order_idx").on(table.externalOrderId),
}));

export type Activation = typeof activations.$inferSelect;
export type InsertActivation = typeof activations.$inferInsert;

/**
 * API Logs table - stores all API requests to SMSHub for debugging
 */
export const apiLogs = mysqlTable("apiLogs", {
  id: int("id").autoincrement().primaryKey(),
  endpoint: varchar("endpoint", { length: 100 }).notNull(),
  action: varchar("action", { length: 50 }).notNull(), // e.g., "getBalance", "getNumber"
  requestParams: text("requestParams"), // JSON string of request parameters
  response: text("response"), // JSON string of response
  statusCode: int("statusCode"),
  success: boolean("success").default(false).notNull(),
  errorMessage: text("errorMessage"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  actionIdx: index("action_idx").on(table.action),
  createdAtIdx: index("created_at_idx").on(table.createdAt),
}));

export type ApiLog = typeof apiLogs.$inferSelect;
export type InsertApiLog = typeof apiLogs.$inferInsert;

/**
 * Price History table - tracks price changes over time
 */
export const priceHistory = mysqlTable("priceHistory", {
  id: int("id").autoincrement().primaryKey(),
  countryId: int("countryId").notNull(),
  serviceId: int("serviceId").notNull(),
  smshubPrice: int("smshubPrice").notNull(),
  ourPrice: int("ourPrice").notNull(),
  changedAt: timestamp("changedAt").defaultNow().notNull(),
}, (table) => ({
  countryServiceIdx: index("country_service_hist_idx").on(table.countryId, table.serviceId),
  changedAtIdx: index("changed_at_idx").on(table.changedAt),
}));

export type PriceHistory = typeof priceHistory.$inferSelect;
export type InsertPriceHistory = typeof priceHistory.$inferInsert;

/**
 * Customers table - stores clients from the sales dashboard
 */
export const customers = mysqlTable("customers", {
  id: int("id").autoincrement().primaryKey(),
  pin: int("pin").notNull().unique(), // Unique sequential PIN for customer identification
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 320 }).notNull().unique(),
  password: varchar("password", { length: 255 }), // Hashed password (bcrypt), nullable for backward compatibility
  balance: int("balance").default(0).notNull(), // Balance in cents
  referredBy: int("referredBy"), // ID of the customer who referred this customer (nullable)
  active: boolean("active").default(true).notNull(),
  banned: boolean("banned").default(false).notNull(), // Permanent ban flag
  bannedAt: timestamp("bannedAt"), // Timestamp when the account was banned
  bannedReason: text("bannedReason"), // Reason for the ban (optional)
  emailVerified: boolean("emailVerified").default(false).notNull(), // Email verification status
  emailVerifiedAt: timestamp("emailVerifiedAt"), // Timestamp when email was verified
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  emailIdx: index("email_idx").on(table.email),
  pinIdx: index("pin_idx").on(table.pin),
}));

export type Customer = typeof customers.$inferSelect;
export type InsertCustomer = typeof customers.$inferInsert;

/**
 * Balance transactions table - tracks all balance changes for customers
 */
export const balanceTransactions = mysqlTable("balance_transactions", {
  id: int("id").autoincrement().primaryKey(),
  customerId: int("customerId").notNull(),
  amount: int("amount").notNull(), // Amount in cents (positive for credit, negative for debit)
  type: mysqlEnum("type", ["credit", "debit", "purchase", "refund", "withdrawal", "hold"]).notNull(),
  description: text("description"),
  balanceBefore: int("balanceBefore").notNull(), // Balance before transaction in cents
  balanceAfter: int("balanceAfter").notNull(), // Balance after transaction in cents
  relatedActivationId: int("relatedActivationId"), // Link to activation if this is a purchase
  createdBy: int("createdBy"), // Admin user who created this transaction
  origin: mysqlEnum("origin", ["api", "customer", "admin", "system"]).default("system").notNull(), // Source of the transaction
  ipAddress: varchar("ipAddress", { length: 45 }), // IP address of the requester (supports IPv6)
  metadata: text("metadata"), // JSON string with additional context
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  customerIdx: index("customer_idx").on(table.customerId),
  typeIdx: index("type_idx").on(table.type),
  createdAtIdx: index("created_at_idx").on(table.createdAt),
  relatedActivationIdx: index("related_activation_idx").on(table.relatedActivationId),
}));

export type BalanceTransaction = typeof balanceTransactions.$inferSelect;
export type InsertBalanceTransaction = typeof balanceTransactions.$inferInsert;

/**
 * Customer Favorites table - stores favorite services for each customer
 */
export const customerFavorites = mysqlTable("customer_favorites", {
  id: int("id").autoincrement().primaryKey(),
  customerId: int("customerId").notNull(),
  serviceId: int("serviceId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  customerServiceIdx: uniqueIndex("customer_service_fav_idx").on(table.customerId, table.serviceId),
  customerIdx: index("customer_fav_idx").on(table.customerId),
}));

export type CustomerFavorite = typeof customerFavorites.$inferSelect;
export type InsertCustomerFavorite = typeof customerFavorites.$inferInsert;

/**
 * SMS APIs table - stores multiple SMSHub-compatible API configurations
 */
export const smsApis = mysqlTable("sms_apis", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(), // e.g., "Opção 1", "Opção 2"
  url: varchar("url", { length: 500 }).notNull(), // API base URL
  token: varchar("token", { length: 500 }).notNull(), // API token/key
  active: boolean("active").default(true).notNull(), // Reativação toggle
  priority: int("priority").default(0).notNull(), // Lower number = higher priority (0 is highest)
  currency: mysqlEnum("currency", ["BRL", "USD"]).default("USD").notNull(), // Currency of API prices (BRL or USD)
  exchangeRate: decimal("exchange_rate", { precision: 6, scale: 2 }).default("1.00").notNull(), // Exchange rate USD to BRL (e.g., 6.00 for $1 = R$6)
  profitPercentage: decimal("profit_percentage", { precision: 5, scale: 2 }).default("0.00").notNull(), // Profit margin percentage (e.g., 150.00 for 150%)
  minimumPrice: int("minimum_price").default(0).notNull(), // Minimum price in cents (e.g., 300 for R$ 3.00)
  maxSimultaneousOrders: int("max_simultaneous_orders").default(0).notNull(), // Maximum simultaneous active orders per customer per API (0 = unlimited)
  cancelLimit: int("cancel_limit").default(5).notNull(), // Maximum cancellations allowed within time window (X)
  cancelWindowMinutes: int("cancel_window_minutes").default(10).notNull(), // Time window in minutes to count cancellations (Y)
  blockDurationMinutes: int("block_duration_minutes").default(30).notNull(), // Duration in minutes to block user after reaching limit (Z)
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  priorityIdx: index("priority_idx").on(table.priority),
  activeIdx: index("active_idx").on(table.active),
}));

export type SmsApi = typeof smsApis.$inferSelect;
export type InsertSmsApi = typeof smsApis.$inferInsert;

/**
 * PIX Transactions table - stores PIX payment transactions from EfiPay
 */
export const pixTransactions = mysqlTable("pix_transactions", {
  id: int("id").autoincrement().primaryKey(),
  customerId: int("customerId").notNull(), // Customer who initiated the recharge
  txid: varchar("txid", { length: 100 }).notNull().unique(), // EfiPay transaction ID
  amount: int("amount").notNull(), // Amount in cents
  status: mysqlEnum("status", ["pending", "paid", "expired", "cancelled"]).default("pending").notNull(),
  pixCopyPaste: text("pixCopyPaste"), // PIX Copia e Cola code
  qrCodeUrl: varchar("qrCodeUrl", { length: 500 }), // URL to QR Code image
  expiresAt: timestamp("expiresAt").notNull(), // When the PIX charge expires
  paidAt: timestamp("paidAt"), // When payment was confirmed
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  customerIdx: index("pix_customer_idx").on(table.customerId),
  statusIdx: index("pix_status_idx").on(table.status),
  txidIdx: uniqueIndex("pix_txid_idx").on(table.txid),
  createdAtIdx: index("pix_created_at_idx").on(table.createdAt),
}));

export type PixTransaction = typeof pixTransactions.$inferSelect;
export type InsertPixTransaction = typeof pixTransactions.$inferInsert;

/**
 * Stripe Transactions table - stores Stripe payment sessions
 * Following Stripe best practices: store only IDs, fetch details from Stripe API
 */
export const stripeTransactions = mysqlTable("stripe_transactions", {
  id: int("id").autoincrement().primaryKey(),
  customerId: int("customerId").notNull(), // Customer who initiated the recharge
  sessionId: varchar("sessionId", { length: 255 }).notNull().unique(), // Stripe Checkout Session ID
  paymentIntentId: varchar("paymentIntentId", { length: 255 }), // Stripe Payment Intent ID (filled after payment)
  amount: int("amount").notNull(), // Amount in cents (cached for quick access)
  status: mysqlEnum("status", ["pending", "completed", "expired", "cancelled"]).default("pending").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  customerIdx: index("stripe_customer_idx").on(table.customerId),
  statusIdx: index("stripe_status_idx").on(table.status),
  sessionIdIdx: uniqueIndex("stripe_session_id_idx").on(table.sessionId),
  createdAtIdx: index("stripe_created_at_idx").on(table.createdAt),
}));

export type StripeTransaction = typeof stripeTransactions.$inferSelect;
export type InsertStripeTransaction = typeof stripeTransactions.$inferInsert;

/**
 * Payment Settings table - controls which payment methods are enabled
 */
export const paymentSettings = mysqlTable("payment_settings", {
  id: int("id").autoincrement().primaryKey(),
  pixEnabled: boolean("pix_enabled").default(true).notNull(),
  pixMinAmount: int("pix_min_amount").default(1000).notNull(), // in cents (R$ 10.00)
  pixBonusPercentage: int("pix_bonus_percentage").default(5).notNull(), // 5%
  stripeEnabled: boolean("stripe_enabled").default(true).notNull(),
  stripeMinAmount: int("stripe_min_amount").default(2000).notNull(), // in cents (R$ 20.00)
  stripeBonusPercentage: int("stripe_bonus_percentage").default(0).notNull(), // 0%
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type PaymentSettings = typeof paymentSettings.$inferSelect;
export type InsertPaymentSettings = typeof paymentSettings.$inferInsert;

/**
 * Customer Sessions table - tracks login sessions for security monitoring
 */
export const customerSessions = mysqlTable("customer_sessions", {
  id: int("id").autoincrement().primaryKey(),
  customerId: int("customerId").notNull(),
  sessionToken: varchar("sessionToken", { length: 255 }).notNull().unique(), // JWT token or session ID
  ipAddress: varchar("ipAddress", { length: 45 }), // IPv4 or IPv6
  deviceType: varchar("deviceType", { length: 100 }), // e.g., "iPhone", "Windows", "Android"
  location: varchar("location", { length: 255 }), // City/State/Country
  userAgent: text("userAgent"), // Full user agent string
  loginAt: timestamp("loginAt").defaultNow().notNull(),
  lastActivityAt: timestamp("lastActivityAt").defaultNow().notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  terminatedAt: timestamp("terminatedAt"), // When session was manually terminated
}, (table) => ({
  customerIdx: index("session_customer_idx").on(table.customerId),
  sessionTokenIdx: uniqueIndex("session_token_idx").on(table.sessionToken),
  isActiveIdx: index("session_is_active_idx").on(table.isActive),
  loginAtIdx: index("session_login_at_idx").on(table.loginAt),
}));

export type CustomerSession = typeof customerSessions.$inferSelect;
export type InsertCustomerSession = typeof customerSessions.$inferInsert;

/**
 * Impersonation Logs table - tracks admin impersonation sessions for security audit
 */
export const impersonationLogs = mysqlTable("impersonation_logs", {
  id: int("id").autoincrement().primaryKey(),
  adminId: int("adminId").notNull(), // Admin user who initiated impersonation
  customerId: int("customerId").notNull(), // Customer being impersonated
  token: varchar("token", { length: 500 }).notNull().unique(), // JWT token for impersonation session
  status: mysqlEnum("status", ["active", "ended", "expired"]).default("active").notNull(),
  ipAddress: varchar("ipAddress", { length: 45 }), // IP address of admin
  userAgent: text("userAgent"), // Browser/device info
  startedAt: timestamp("startedAt").defaultNow().notNull(),
  endedAt: timestamp("endedAt"), // When impersonation was manually ended
  expiresAt: timestamp("expiresAt").notNull(), // Token expiration (10 minutes from creation)
}, (table) => ({
  adminIdx: index("impersonation_admin_idx").on(table.adminId),
  customerIdx: index("impersonation_customer_idx").on(table.customerId),
  tokenIdx: uniqueIndex("impersonation_token_idx").on(table.token),
  statusIdx: index("impersonation_status_idx").on(table.status),
  startedAtIdx: index("impersonation_started_at_idx").on(table.startedAt),
}));

export type ImpersonationLog = typeof impersonationLogs.$inferSelect;
export type InsertImpersonationLog = typeof impersonationLogs.$inferInsert;

/**
 * SMS Messages table - stores all SMS codes received for each activation
 * Allows multiple SMS per activation for services that send multiple codes
 */
export const smsMessages = mysqlTable("sms_messages", {
  id: int("id").autoincrement().primaryKey(),
  activationId: int("activationId").notNull(), // FK to activations.id
  code: varchar("code", { length: 100 }).notNull(), // The SMS verification code
  fullText: text("fullText"), // Full SMS message text (optional)
  receivedAt: timestamp("receivedAt").defaultNow().notNull(), // When SMS was received
}, (table) => ({
  activationIdx: index("sms_activation_idx").on(table.activationId),
  receivedAtIdx: index("sms_received_at_idx").on(table.receivedAt),
}));

export type SmsMessage = typeof smsMessages.$inferSelect;
export type InsertSmsMessage = typeof smsMessages.$inferInsert;

/**
 * Affiliate Settings table - stores global configuration for the referral program
 */
export const affiliateSettings = mysqlTable("affiliate_settings", {
  id: int("id").autoincrement().primaryKey(),
  bonusPercentage: int("bonusPercentage").default(10).notNull(), // Percentage of first recharge given as bonus (e.g., 10 for 10%)
  description: text("description"), // Description of the program
  isActive: boolean("isActive").default(true).notNull(), // Enable/disable entire referral program
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type AffiliateSetting = typeof affiliateSettings.$inferSelect;
export type InsertAffiliateSetting = typeof affiliateSettings.$inferInsert;

/**
 * Referrals table - tracks who referred whom
 */
export const referrals = mysqlTable("referrals", {
  id: int("id").autoincrement().primaryKey(),
  referrerId: int("referrerId").notNull(), // Customer who shared the referral link
  referredId: int("referredId").notNull().unique(), // Customer who signed up via the link (can only be referred once)
  firstRechargeAt: timestamp("firstRechargeAt"), // When the referred customer made their first recharge
  firstRechargeAmount: int("firstRechargeAmount"), // Amount of first recharge in cents
  bonusGenerated: int("bonusGenerated"), // Bonus amount generated in cents
  status: mysqlEnum("status", ["pending", "active", "completed"]).default("pending").notNull(), // pending = no recharge yet, active = recharge done, completed = bonus paid
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  referrerIdx: index("referrer_idx").on(table.referrerId),
  referredIdx: uniqueIndex("referred_idx").on(table.referredId),
  statusIdx: index("referral_status_idx").on(table.status),
}));

export type Referral = typeof referrals.$inferSelect;
export type InsertReferral = typeof referrals.$inferInsert;

/**
 * Referral Earnings table - tracks all bonus payments to affiliates
 */
export const referralEarnings = mysqlTable("referral_earnings", {
  id: int("id").autoincrement().primaryKey(),
  affiliateId: int("affiliateId").notNull(), // Customer who earned the bonus
  referralId: int("referralId").notNull(), // Link to the referral that generated this bonus
  amount: int("amount").notNull(), // Bonus amount in cents
  description: text("description"), // e.g., "Bônus de 10% pela primeira recarga de Cliente #123"
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  affiliateIdx: index("affiliate_idx").on(table.affiliateId),
  referralIdx: index("referral_earning_idx").on(table.referralId),
  createdAtIdx: index("earning_created_at_idx").on(table.createdAt),
}));

export type ReferralEarning = typeof referralEarnings.$inferSelect;
export type InsertReferralEarning = typeof referralEarnings.$inferInsert;

/**
 * Admin Menus table - stores navigation menu items and their order
 */
export const adminMenus = mysqlTable("admin_menus", {
  id: int("id").autoincrement().primaryKey(),
  label: varchar("label", { length: 100 }).notNull(), // Menu label (e.g., "Dashboard", "Países")
  path: varchar("path", { length: 255 }).notNull(), // Route path (e.g., "/", "/countries")
  icon: varchar("icon", { length: 50 }), // Icon name (e.g., "LayoutDashboard", "Globe")
  position: int("position").notNull(), // Display order (lower = higher in menu)
  active: boolean("active").default(true).notNull(), // Show/hide menu item
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  positionIdx: index("position_idx").on(table.position),
  pathIdx: uniqueIndex("path_idx").on(table.path),
}));

export type AdminMenu = typeof adminMenus.$inferSelect;
export type InsertAdminMenu = typeof adminMenus.$inferInsert;

/**
 * Recharges table - stores all customer balance recharges
 */
export const recharges = mysqlTable("recharges", {
  id: int("id").autoincrement().primaryKey(),
  customerId: int("customerId").notNull(), // Customer who made the recharge
  amount: int("amount").notNull(), // Recharge amount in cents
  paymentMethod: mysqlEnum("paymentMethod", ["pix", "card", "crypto", "picpay"]).notNull(),
  status: mysqlEnum("status", ["completed", "pending", "expired"]).default("pending").notNull(),
  transactionId: varchar("transactionId", { length: 255 }), // External payment provider transaction ID
  stripePaymentIntentId: varchar("stripe_payment_intent_id", { length: 255 }), // Stripe Payment Intent ID
  metadata: text("metadata"), // JSON string for additional payment data
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  completedAt: timestamp("completedAt"), // When the payment was confirmed
  expiresAt: timestamp("expiresAt"), // When pending payment expires
}, (table) => ({
  customerIdx: index("recharge_customer_idx").on(table.customerId),
  statusIdx: index("recharge_status_idx").on(table.status),
  createdAtIdx: index("recharge_created_at_idx").on(table.createdAt),
  paymentMethodIdx: index("recharge_payment_method_idx").on(table.paymentMethod),
  stripePaymentIntentIdx: index("recharge_stripe_payment_intent_idx").on(table.stripePaymentIntentId),
}));

export type Recharge = typeof recharges.$inferSelect;
export type InsertRecharge = typeof recharges.$inferInsert;

/**
 * Cancellation Logs table - tracks user cancellations for rate limiting
 */
export const cancellationLogs = mysqlTable("cancellation_logs", {
  id: int("id").autoincrement().primaryKey(),
  customerId: int("customerId").notNull(), // Customer who cancelled
  apiId: int("apiId").notNull(), // API where cancellation occurred
  activationId: int("activationId"), // Optional: reference to cancelled activation
  timestamp: timestamp("timestamp").defaultNow().notNull(), // When cancellation occurred
}, (table) => ({
  customerApiIdx: index("cancellation_customer_api_idx").on(table.customerId, table.apiId),
  timestampIdx: index("cancellation_timestamp_idx").on(table.timestamp),
}));

export type CancellationLog = typeof cancellationLogs.$inferSelect;
export type InsertCancellationLog = typeof cancellationLogs.$inferInsert;

/**
 * Email Verifications table - stores verification codes for email confirmation
 */
export const emailVerifications = mysqlTable("email_verifications", {
  id: int("id").autoincrement().primaryKey(),
  customerId: int("customerId").notNull(), // Customer who needs to verify email
  code: varchar("code", { length: 6 }).notNull(), // 6-digit verification code
  expiresAt: timestamp("expiresAt").notNull(), // When the code expires (15 minutes)
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  usedAt: timestamp("usedAt"), // When the code was used (null if not used yet)
}, (table) => ({
  customerCodeIdx: index("verification_customer_code_idx").on(table.customerId, table.code),
  expiresIdx: index("verification_expires_idx").on(table.expiresAt),
}));

export type EmailVerification = typeof emailVerifications.$inferSelect;
export type InsertEmailVerification = typeof emailVerifications.$inferInsert;

/**
 * Notifications table - stores user notifications history
 */
export const notifications = mysqlTable("notifications", {
  id: int("id").autoincrement().primaryKey(),
  customerId: int("customerId"), // Customer who receives the notification (NULL for global notifications)
  type: varchar("type", { length: 50 }).notNull(), // e.g., "pix_payment_confirmed", "balance_updated"
  title: varchar("title", { length: 255 }).notNull(),
  message: text("message").notNull(),
  data: text("data"), // JSON string for additional notification data
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  customerIdx: index("notification_customer_idx").on(table.customerId),
  createdAtIdx: index("notification_created_at_idx").on(table.createdAt),
}));

export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = typeof notifications.$inferInsert;

/**
 * Notification Reads table - tracks which customers have read which notifications
 * This allows per-user read state for global notifications
 */
export const notificationReads = mysqlTable("notification_reads", {
  id: int("id").autoincrement().primaryKey(),
  notificationId: int("notificationId").notNull(),
  customerId: int("customerId").notNull(),
  readAt: timestamp("readAt").defaultNow().notNull(),
}, (table) => ({
  // Unique constraint: each customer can only mark a notification as read once
  notificationCustomerIdx: uniqueIndex("notification_customer_unique_idx").on(table.notificationId, table.customerId),
  // Index for fast queries by customer ("get all read notifications for this user")
  customerIdx: index("notification_reads_customer_idx").on(table.customerId),
  // Index for fast queries by notification ("who has read this notification")
  notificationIdx: index("notification_reads_notification_idx").on(table.notificationId),
}));

export type NotificationRead = typeof notificationReads.$inferSelect;
export type InsertNotificationRead = typeof notificationReads.$inferInsert;

/**
 * Password Reset Tokens table - stores tokens for password recovery
 */
export const passwordResetTokens = mysqlTable("password_reset_tokens", {
  id: int("id").autoincrement().primaryKey(),
  customerId: int("customer_id").notNull(), // Customer requesting password reset
  token: varchar("token", { length: 255 }).notNull().unique(), // Unique reset token
  expiresAt: timestamp("expires_at").notNull(), // Token expiration (1 hour)
  used: boolean("used").default(false).notNull(), // Whether token has been used
  createdAt: timestamp("created_at").defaultNow().notNull(),
  usedAt: timestamp("used_at"), // When token was used
}, (table) => ({
  tokenIdx: index("token_idx").on(table.token),
  customerIdx: index("customer_id_idx").on(table.customerId),
  expiresIdx: index("expires_at_idx").on(table.expiresAt),
}));

export type PasswordResetToken = typeof passwordResetTokens.$inferSelect;
export type InsertPasswordResetToken = typeof passwordResetTokens.$inferInsert;

/**
 * API Performance Stats table - stores daily performance metrics for each SMS API
 */
export const apiPerformanceStats = mysqlTable("api_performance_stats", {
  id: int("id").autoincrement().primaryKey(),
  apiId: int("apiId").notNull(), // FK to sms_apis.id
  date: varchar("date", { length: 10 }).notNull(), // YYYY-MM-DD format
  totalActivations: int("totalActivations").default(0).notNull(), // Total activations for the day
  completed: int("completed").default(0).notNull(), // Activations that received SMS
  cancelled: int("cancelled").default(0).notNull(), // Cancelled activations
  expired: int("expired").default(0).notNull(), // Expired activations
  successRate: int("successRate").default(0).notNull(), // Success rate as integer (0-100)
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  apiDateIdx: uniqueIndex("api_date_idx").on(table.apiId, table.date),
  apiIdx: index("api_idx").on(table.apiId),
  dateIdx: index("date_idx").on(table.date),
}));

export type ApiPerformanceStat = typeof apiPerformanceStats.$inferSelect;
export type InsertApiPerformanceStat = typeof apiPerformanceStats.$inferInsert;
