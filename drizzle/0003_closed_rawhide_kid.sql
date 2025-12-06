CREATE TABLE `balance_transactions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`customerId` int NOT NULL,
	`amount` int NOT NULL,
	`type` enum('credit','debit','purchase','refund') NOT NULL,
	`description` text,
	`balanceBefore` int NOT NULL,
	`balanceAfter` int NOT NULL,
	`relatedActivationId` int,
	`createdBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `balance_transactions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `customers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`email` varchar(320) NOT NULL,
	`balance` int NOT NULL DEFAULT 0,
	`active` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `customers_id` PRIMARY KEY(`id`),
	CONSTRAINT `customers_email_unique` UNIQUE(`email`)
);
--> statement-breakpoint
CREATE INDEX `customer_idx` ON `balance_transactions` (`customerId`);--> statement-breakpoint
CREATE INDEX `type_idx` ON `balance_transactions` (`type`);--> statement-breakpoint
CREATE INDEX `created_at_idx` ON `balance_transactions` (`createdAt`);--> statement-breakpoint
CREATE INDEX `email_idx` ON `customers` (`email`);