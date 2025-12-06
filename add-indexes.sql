-- Índices otimizados para melhorar performance das consultas

-- Índices para tabela customers
CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);
CREATE INDEX IF NOT EXISTS idx_customers_pin ON customers(pin);
CREATE INDEX IF NOT EXISTS idx_customers_active ON customers(active);

-- Índices para tabela activations
CREATE INDEX IF NOT EXISTS idx_activations_customer ON activations(customerId);
CREATE INDEX IF NOT EXISTS idx_activations_status ON activations(status);
CREATE INDEX IF NOT EXISTS idx_activations_created ON activations(createdAt);

-- Índice composto para tabela prices (consultas por país + serviço)
CREATE INDEX IF NOT EXISTS idx_prices_country_service ON prices(countryId, serviceId);

-- Índices para tabela countries
CREATE INDEX IF NOT EXISTS idx_countries_active ON countries(active);
CREATE INDEX IF NOT EXISTS idx_countries_code ON countries(code);

-- Índices para tabela services  
CREATE INDEX IF NOT EXISTS idx_services_active ON services(active);
CREATE INDEX IF NOT EXISTS idx_services_category ON services(category);

-- Índice para tabela balance_transactions
CREATE INDEX IF NOT EXISTS idx_balance_transactions_customer ON balance_transactions(customerId);
CREATE INDEX IF NOT EXISTS idx_balance_transactions_created ON balance_transactions(createdAt);
