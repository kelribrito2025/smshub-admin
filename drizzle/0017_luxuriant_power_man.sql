CREATE TABLE `customer_sessions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`customerId` int NOT NULL,
	`sessionToken` varchar(255) NOT NULL,
	`ipAddress` varchar(45),
	`deviceType` varchar(100),
	`location` varchar(255),
	`userAgent` text,
	`loginAt` timestamp NOT NULL DEFAULT (now()),
	`lastActivityAt` timestamp NOT NULL DEFAULT (now()),
	`isActive` boolean NOT NULL DEFAULT true,
	`terminatedAt` timestamp,
	CONSTRAINT `customer_sessions_id` PRIMARY KEY(`id`),
	CONSTRAINT `customer_sessions_sessionToken_unique` UNIQUE(`sessionToken`),
	CONSTRAINT `session_token_idx` UNIQUE(`sessionToken`)
);
--> statement-breakpoint
CREATE INDEX `session_customer_idx` ON `customer_sessions` (`customerId`);--> statement-breakpoint
CREATE INDEX `session_is_active_idx` ON `customer_sessions` (`isActive`);--> statement-breakpoint
CREATE INDEX `session_login_at_idx` ON `customer_sessions` (`loginAt`);