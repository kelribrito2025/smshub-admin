ALTER TABLE `notification_reads` DROP INDEX `notification_user_unique_idx`;--> statement-breakpoint
DROP INDEX `notification_reads_user_idx` ON `notification_reads`;--> statement-breakpoint
ALTER TABLE `notification_reads` ADD `customerId` int NOT NULL;--> statement-breakpoint
ALTER TABLE `notification_reads` ADD CONSTRAINT `notification_customer_unique_idx` UNIQUE(`notificationId`,`customerId`);--> statement-breakpoint
CREATE INDEX `notification_reads_customer_idx` ON `notification_reads` (`customerId`);--> statement-breakpoint
ALTER TABLE `notification_reads` DROP COLUMN `userId`;--> statement-breakpoint
ALTER TABLE `notification_reads` DROP COLUMN `userType`;