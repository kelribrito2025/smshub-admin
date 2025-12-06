ALTER TABLE `balance_transactions` ADD `origin` enum('api','customer','admin','system') DEFAULT 'system' NOT NULL;--> statement-breakpoint
ALTER TABLE `balance_transactions` ADD `ipAddress` varchar(45);--> statement-breakpoint
ALTER TABLE `balance_transactions` ADD `metadata` text;--> statement-breakpoint
CREATE INDEX `related_activation_idx` ON `balance_transactions` (`relatedActivationId`);