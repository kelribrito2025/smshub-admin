CREATE TABLE `payment_settings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`pix_enabled` boolean NOT NULL DEFAULT true,
	`stripe_enabled` boolean NOT NULL DEFAULT true,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `payment_settings_id` PRIMARY KEY(`id`)
);
