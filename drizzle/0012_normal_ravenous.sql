ALTER TABLE `notification_reads` RENAME COLUMN `customerId` TO `userId`;--> statement-breakpoint
ALTER TABLE `notification_reads` DROP INDEX `notification_customer_unique_idx`;--> statement-breakpoint
DROP INDEX `notification_reads_customer_idx` ON `notification_reads`;--> statement-breakpoint
ALTER TABLE `notification_reads` ADD `userType` enum('admin','customer') NOT NULL;--> statement-breakpoint
ALTER TABLE `notification_reads` ADD CONSTRAINT `notification_user_unique_idx` UNIQUE(`notificationId`,`userId`,`userType`);--> statement-breakpoint
CREATE INDEX `notification_reads_user_idx` ON `notification_reads` (`userId`,`userType`);