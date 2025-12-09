CREATE TABLE `notification_reads` (
	`id` int AUTO_INCREMENT NOT NULL,
	`notificationId` int NOT NULL,
	`customerId` int NOT NULL,
	`readAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `notification_reads_id` PRIMARY KEY(`id`),
	CONSTRAINT `notification_customer_unique_idx` UNIQUE(`notificationId`,`customerId`)
);
--> statement-breakpoint
DROP INDEX `notification_is_read_idx` ON `notifications`;--> statement-breakpoint
CREATE INDEX `notification_reads_customer_idx` ON `notification_reads` (`customerId`);--> statement-breakpoint
CREATE INDEX `notification_reads_notification_idx` ON `notification_reads` (`notificationId`);--> statement-breakpoint
ALTER TABLE `notifications` DROP COLUMN `isRead`;