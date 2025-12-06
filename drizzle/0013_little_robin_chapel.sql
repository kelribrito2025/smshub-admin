CREATE TABLE `pix_transactions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`customerId` int NOT NULL,
	`txid` varchar(100) NOT NULL,
	`amount` int NOT NULL,
	`status` enum('pending','paid','expired','cancelled') NOT NULL DEFAULT 'pending',
	`pixCopyPaste` text,
	`qrCodeUrl` varchar(500),
	`expiresAt` timestamp NOT NULL,
	`paidAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `pix_transactions_id` PRIMARY KEY(`id`),
	CONSTRAINT `pix_transactions_txid_unique` UNIQUE(`txid`),
	CONSTRAINT `pix_txid_idx` UNIQUE(`txid`)
);
--> statement-breakpoint
CREATE INDEX `pix_customer_idx` ON `pix_transactions` (`customerId`);--> statement-breakpoint
CREATE INDEX `pix_status_idx` ON `pix_transactions` (`status`);--> statement-breakpoint
CREATE INDEX `pix_created_at_idx` ON `pix_transactions` (`createdAt`);