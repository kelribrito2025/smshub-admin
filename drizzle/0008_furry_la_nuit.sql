CREATE TABLE `email_verifications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`customerId` int NOT NULL,
	`code` varchar(6) NOT NULL,
	`expiresAt` timestamp NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`usedAt` timestamp,
	CONSTRAINT `email_verifications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `customers` ADD `emailVerified` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `customers` ADD `emailVerifiedAt` timestamp;--> statement-breakpoint
CREATE INDEX `verification_customer_code_idx` ON `email_verifications` (`customerId`,`code`);--> statement-breakpoint
CREATE INDEX `verification_expires_idx` ON `email_verifications` (`expiresAt`);