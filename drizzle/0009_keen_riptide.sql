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
CREATE INDEX `notification_customer_idx` ON `notifications` (`customerId`);--> statement-breakpoint
CREATE INDEX `notification_created_at_idx` ON `notifications` (`createdAt`);--> statement-breakpoint
CREATE INDEX `notification_is_read_idx` ON `notifications` (`isRead`);