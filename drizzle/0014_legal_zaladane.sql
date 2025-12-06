CREATE TABLE `stripe_transactions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`customerId` int NOT NULL,
	`sessionId` varchar(255) NOT NULL,
	`paymentIntentId` varchar(255),
	`amount` int NOT NULL,
	`status` enum('pending','completed','expired','cancelled') NOT NULL DEFAULT 'pending',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `stripe_transactions_id` PRIMARY KEY(`id`),
	CONSTRAINT `stripe_transactions_sessionId_unique` UNIQUE(`sessionId`),
	CONSTRAINT `stripe_session_id_idx` UNIQUE(`sessionId`)
);
--> statement-breakpoint
CREATE INDEX `stripe_customer_idx` ON `stripe_transactions` (`customerId`);--> statement-breakpoint
CREATE INDEX `stripe_status_idx` ON `stripe_transactions` (`status`);--> statement-breakpoint
CREATE INDEX `stripe_created_at_idx` ON `stripe_transactions` (`createdAt`);