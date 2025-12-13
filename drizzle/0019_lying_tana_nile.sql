CREATE TABLE `impersonation_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`adminId` int NOT NULL,
	`customerId` int NOT NULL,
	`token` varchar(500) NOT NULL,
	`status` enum('active','ended','expired') NOT NULL DEFAULT 'active',
	`ipAddress` varchar(45),
	`userAgent` text,
	`startedAt` timestamp NOT NULL DEFAULT (now()),
	`endedAt` timestamp,
	`expiresAt` timestamp NOT NULL,
	CONSTRAINT `impersonation_logs_id` PRIMARY KEY(`id`),
	CONSTRAINT `impersonation_logs_token_unique` UNIQUE(`token`),
	CONSTRAINT `impersonation_token_idx` UNIQUE(`token`)
);
--> statement-breakpoint
ALTER TABLE `users` ADD `permissions` text;--> statement-breakpoint
CREATE INDEX `impersonation_admin_idx` ON `impersonation_logs` (`adminId`);--> statement-breakpoint
CREATE INDEX `impersonation_customer_idx` ON `impersonation_logs` (`customerId`);--> statement-breakpoint
CREATE INDEX `impersonation_status_idx` ON `impersonation_logs` (`status`);--> statement-breakpoint
CREATE INDEX `impersonation_started_at_idx` ON `impersonation_logs` (`startedAt`);