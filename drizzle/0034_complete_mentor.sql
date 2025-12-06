CREATE TABLE `recharges` (
	`id` int AUTO_INCREMENT NOT NULL,
	`customerId` int NOT NULL,
	`amount` int NOT NULL,
	`paymentMethod` enum('pix','card','crypto','picpay') NOT NULL,
	`status` enum('completed','pending','expired') NOT NULL DEFAULT 'pending',
	`transactionId` varchar(255),
	`metadata` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`completedAt` timestamp,
	`expiresAt` timestamp,
	CONSTRAINT `recharges_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `recharge_customer_idx` ON `recharges` (`customerId`);--> statement-breakpoint
CREATE INDEX `recharge_status_idx` ON `recharges` (`status`);--> statement-breakpoint
CREATE INDEX `recharge_created_at_idx` ON `recharges` (`createdAt`);--> statement-breakpoint
CREATE INDEX `recharge_payment_method_idx` ON `recharges` (`paymentMethod`);