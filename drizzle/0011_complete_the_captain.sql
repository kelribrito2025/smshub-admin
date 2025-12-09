ALTER TABLE `recharges` ADD `stripe_payment_intent_id` varchar(255);--> statement-breakpoint
CREATE INDEX `recharge_stripe_payment_intent_idx` ON `recharges` (`stripe_payment_intent_id`);