CREATE TABLE `cancellation_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`customerId` int NOT NULL,
	`apiId` int NOT NULL,
	`activationId` int,
	`timestamp` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `cancellation_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `sms_apis` ADD `cancel_limit` int DEFAULT 5 NOT NULL;--> statement-breakpoint
ALTER TABLE `sms_apis` ADD `cancel_window_minutes` int DEFAULT 10 NOT NULL;--> statement-breakpoint
ALTER TABLE `sms_apis` ADD `block_duration_minutes` int DEFAULT 30 NOT NULL;--> statement-breakpoint
CREATE INDEX `cancellation_customer_api_idx` ON `cancellation_logs` (`customerId`,`apiId`);--> statement-breakpoint
CREATE INDEX `cancellation_timestamp_idx` ON `cancellation_logs` (`timestamp`);