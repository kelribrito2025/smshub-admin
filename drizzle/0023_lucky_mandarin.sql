CREATE TABLE `refunds` (
	`id` int AUTO_INCREMENT NOT NULL,
	`customerId` int NOT NULL,
	`rechargeId` int,
	`paymentMethod` enum('pix','card') NOT NULL,
	`amount` int NOT NULL,
	`originalAmount` int NOT NULL,
	`status` enum('pending','completed','failed') NOT NULL DEFAULT 'pending',
	`paymentId` varchar(255),
	`endToEndId` varchar(255),
	`refundId` varchar(255),
	`reason` text,
	`processedBy` int,
	`metadata` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`completedAt` timestamp,
	CONSTRAINT `refunds_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `refund_customer_idx` ON `refunds` (`customerId`);--> statement-breakpoint
CREATE INDEX `refund_status_idx` ON `refunds` (`status`);--> statement-breakpoint
CREATE INDEX `refund_created_at_idx` ON `refunds` (`createdAt`);--> statement-breakpoint
CREATE INDEX `refund_payment_method_idx` ON `refunds` (`paymentMethod`);