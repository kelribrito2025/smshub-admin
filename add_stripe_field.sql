ALTER TABLE recharges 
ADD COLUMN stripe_payment_intent_id VARCHAR(255) NULL AFTER transactionId,
ADD INDEX recharge_stripe_payment_intent_idx (stripe_payment_intent_id);
