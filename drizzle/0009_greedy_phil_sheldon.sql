CREATE TABLE `notifications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`customerId` int NOT NULL,
	`type` varchar(50) NOT NULL,
	`title` varchar(255) NOT NULL,
	`message` text NOT NULL,
	`data` text,
	`isRead` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `notifications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `password_reset_tokens` (
	`id` int AUTO_INCREMENT NOT NULL,
	`customer_id` int NOT NULL,
	`token` varchar(255) NOT NULL,
	`expires_at` timestamp NOT NULL,
	`used` boolean NOT NULL DEFAULT false,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`used_at` timestamp,
	CONSTRAINT `password_reset_tokens_id` PRIMARY KEY(`id`),
	CONSTRAINT `password_reset_tokens_token_unique` UNIQUE(`token`)
);
--> statement-breakpoint
ALTER TABLE `recharges` ADD `stripe_payment_intent_id` varchar(255);--> statement-breakpoint
CREATE INDEX `notification_customer_idx` ON `notifications` (`customerId`);--> statement-breakpoint
CREATE INDEX `notification_created_at_idx` ON `notifications` (`createdAt`);--> statement-breakpoint
CREATE INDEX `notification_is_read_idx` ON `notifications` (`isRead`);--> statement-breakpoint
CREATE INDEX `token_idx` ON `password_reset_tokens` (`token`);--> statement-breakpoint
CREATE INDEX `customer_id_idx` ON `password_reset_tokens` (`customer_id`);--> statement-breakpoint
CREATE INDEX `expires_at_idx` ON `password_reset_tokens` (`expires_at`);--> statement-breakpoint
CREATE INDEX `recharge_stripe_payment_intent_idx` ON `recharges` (`stripe_payment_intent_id`);