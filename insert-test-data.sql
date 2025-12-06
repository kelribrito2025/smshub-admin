-- Inserir ativações de teste para demonstrar sistema de recomendação
-- Serviço ID 1 (assumindo que é um dos serviços disponíveis)
-- API 1: 90% de sucesso (18 completed, 2 cancelled)
-- API 2: 70% de sucesso (14 completed, 6 cancelled)  
-- API 3: 50% de sucesso (10 completed, 10 cancelled)

-- API 1 - Alta taxa de sucesso (90%)
INSERT INTO activations (userId, serviceId, countryId, apiId, phoneNumber, status, smshubId, createdAt, updatedAt)
SELECT 
  180002,
  1,
  1,
  1,
  CONCAT('+5511', LPAD(FLOOR(RAND() * 100000000), 8, '0')),
  'completed',
  FLOOR(RAND() * 1000000),
  DATE_SUB(NOW(), INTERVAL FLOOR(RAND() * 30) DAY),
  DATE_SUB(NOW(), INTERVAL FLOOR(RAND() * 30) DAY)
FROM (SELECT 1 UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 UNION SELECT 5 
      UNION SELECT 6 UNION SELECT 7 UNION SELECT 8 UNION SELECT 9 UNION SELECT 10
      UNION SELECT 11 UNION SELECT 12 UNION SELECT 13 UNION SELECT 14 UNION SELECT 15
      UNION SELECT 16 UNION SELECT 17 UNION SELECT 18) AS numbers;

INSERT INTO activations (userId, serviceId, countryId, apiId, phoneNumber, status, smshubId, createdAt, updatedAt)
SELECT 
  180002,
  1,
  1,
  1,
  CONCAT('+5511', LPAD(FLOOR(RAND() * 100000000), 8, '0')),
  'cancelled',
  FLOOR(RAND() * 1000000),
  DATE_SUB(NOW(), INTERVAL FLOOR(RAND() * 30) DAY),
  DATE_SUB(NOW(), INTERVAL FLOOR(RAND() * 30) DAY)
FROM (SELECT 1 UNION SELECT 2) AS numbers;

-- API 2 - Média taxa de sucesso (70%)
INSERT INTO activations (userId, serviceId, countryId, apiId, phoneNumber, status, smshubId, createdAt, updatedAt)
SELECT 
  180002,
  1,
  1,
  2,
  CONCAT('+5511', LPAD(FLOOR(RAND() * 100000000), 8, '0')),
  'completed',
  FLOOR(RAND() * 1000000),
  DATE_SUB(NOW(), INTERVAL FLOOR(RAND() * 30) DAY),
  DATE_SUB(NOW(), INTERVAL FLOOR(RAND() * 30) DAY)
FROM (SELECT 1 UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 UNION SELECT 5 
      UNION SELECT 6 UNION SELECT 7 UNION SELECT 8 UNION SELECT 9 UNION SELECT 10
      UNION SELECT 11 UNION SELECT 12 UNION SELECT 13 UNION SELECT 14) AS numbers;

INSERT INTO activations (userId, serviceId, countryId, apiId, phoneNumber, status, smshubId, createdAt, updatedAt)
SELECT 
  180002,
  1,
  1,
  2,
  CONCAT('+5511', LPAD(FLOOR(RAND() * 100000000), 8, '0')),
  'cancelled',
  FLOOR(RAND() * 1000000),
  DATE_SUB(NOW(), INTERVAL FLOOR(RAND() * 30) DAY),
  DATE_SUB(NOW(), INTERVAL FLOOR(RAND() * 30) DAY)
FROM (SELECT 1 UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 UNION SELECT 5 UNION SELECT 6) AS numbers;

-- API 3 - Baixa taxa de sucesso (50%)
INSERT INTO activations (userId, serviceId, countryId, apiId, phoneNumber, status, smshubId, createdAt, updatedAt)
SELECT 
  180002,
  1,
  1,
  3,
  CONCAT('+5511', LPAD(FLOOR(RAND() * 100000000), 8, '0')),
  'completed',
  FLOOR(RAND() * 1000000),
  DATE_SUB(NOW(), INTERVAL FLOOR(RAND() * 30) DAY),
  DATE_SUB(NOW(), INTERVAL FLOOR(RAND() * 30) DAY)
FROM (SELECT 1 UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 UNION SELECT 5 
      UNION SELECT 6 UNION SELECT 7 UNION SELECT 8 UNION SELECT 9 UNION SELECT 10) AS numbers;

INSERT INTO activations (userId, serviceId, countryId, apiId, phoneNumber, status, smshubId, createdAt, updatedAt)
SELECT 
  180002,
  1,
  1,
  3,
  CONCAT('+5511', LPAD(FLOOR(RAND() * 100000000), 8, '0')),
  'cancelled',
  FLOOR(RAND() * 1000000),
  DATE_SUB(NOW(), INTERVAL FLOOR(RAND() * 30) DAY),
  DATE_SUB(NOW(), INTERVAL FLOOR(RAND() * 30) DAY)
FROM (SELECT 1 UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 UNION SELECT 5 
      UNION SELECT 6 UNION SELECT 7 UNION SELECT 8 UNION SELECT 9 UNION SELECT 10) AS numbers;
