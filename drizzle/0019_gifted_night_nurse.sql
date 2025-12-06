CREATE TABLE `affiliate_settings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`bonusPercentage` int NOT NULL DEFAULT 10,
	`isActive` boolean NOT NULL DEFAULT true,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `affiliate_settings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `referral_earnings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`affiliateId` int NOT NULL,
	`referralId` int NOT NULL,
	`amount` int NOT NULL,
	`description` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `referral_earnings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `referrals` (
	`id` int AUTO_INCREMENT NOT NULL,
	`referrerId` int NOT NULL,
	`referredId` int NOT NULL,
	`firstRechargeAt` timestamp,
	`firstRechargeAmount` int,
	`bonusGenerated` int,
	`status` enum('pending','active','completed') NOT NULL DEFAULT 'pending',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `referrals_id` PRIMARY KEY(`id`),
	CONSTRAINT `referrals_referredId_unique` UNIQUE(`referredId`),
	CONSTRAINT `referred_idx` UNIQUE(`referredId`)
);
--> statement-breakpoint
ALTER TABLE `customers` ADD `bonusBalance` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `customers` ADD `referredBy` int;--> statement-breakpoint
CREATE INDEX `affiliate_idx` ON `referral_earnings` (`affiliateId`);--> statement-breakpoint
CREATE INDEX `referral_earning_idx` ON `referral_earnings` (`referralId`);--> statement-breakpoint
CREATE INDEX `earning_created_at_idx` ON `referral_earnings` (`createdAt`);--> statement-breakpoint
CREATE INDEX `referrer_idx` ON `referrals` (`referrerId`);--> statement-breakpoint
CREATE INDEX `referral_status_idx` ON `referrals` (`status`);