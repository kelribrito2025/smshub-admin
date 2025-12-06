-- Verificar se há clientes com saldo != soma de transações
SELECT 
  c.id,
  c.name,
  c.email,
  c.balance as saldo_atual,
  COALESCE(SUM(CASE WHEN bt.amount > 0 THEN bt.amount ELSE 0 END), 0) as total_creditos,
  COALESCE(SUM(CASE WHEN bt.amount < 0 THEN ABS(bt.amount) ELSE 0 END), 0) as total_debitos,
  (COALESCE(SUM(CASE WHEN bt.amount > 0 THEN bt.amount ELSE 0 END), 0) - COALESCE(SUM(CASE WHEN bt.amount < 0 THEN ABS(bt.amount) ELSE 0 END), 0)) as saldo_esperado,
  (c.balance - (COALESCE(SUM(CASE WHEN bt.amount > 0 THEN bt.amount ELSE 0 END), 0) - COALESCE(SUM(CASE WHEN bt.amount < 0 THEN ABS(bt.amount) ELSE 0 END), 0))) as diferenca
FROM customers c
LEFT JOIN balance_transactions bt ON c.id = bt.customerId
WHERE c.active = 1
GROUP BY c.id, c.name, c.email, c.balance
HAVING diferenca != 0
LIMIT 10;
