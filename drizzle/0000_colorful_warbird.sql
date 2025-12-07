CREATE TABLE `activations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`smshubActivationId` varchar(50),
	`apiId` int,
	`userId` int,
	`serviceId` int NOT NULL,
	`countryId` int NOT NULL,
	`phoneNumber` varchar(20),
	`status` enum('pending','active','completed','cancelled','failed','expired') NOT NULL DEFAULT 'pending',
	`smshubStatus` varchar(50),
	`smsCode` varchar(100),
	`smshubCost` int NOT NULL DEFAULT 0,
	`sellingPrice` int NOT NULL DEFAULT 0,
	`profit` int NOT NULL DEFAULT 0,
	`externalOrderId` varchar(100),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`completedAt` timestamp,
	CONSTRAINT `activations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `admin_menus` (
	`id` int AUTO_INCREMENT NOT NULL,
	`label` varchar(100) NOT NULL,
	`path` varchar(255) NOT NULL,
	`icon` varchar(50),
	`position` int NOT NULL,
	`active` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `admin_menus_id` PRIMARY KEY(`id`),
	CONSTRAINT `path_idx` UNIQUE(`path`)
);
--> statement-breakpoint
CREATE TABLE `affiliate_settings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`bonusPercentage` int NOT NULL DEFAULT 10,
	`isActive` boolean NOT NULL DEFAULT true,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `affiliate_settings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `api_keys` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`key` varchar(64) NOT NULL,
	`active` int NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`lastUsedAt` timestamp,
	`expiresAt` timestamp,
	CONSTRAINT `api_keys_id` PRIMARY KEY(`id`),
	CONSTRAINT `api_keys_key_unique` UNIQUE(`key`)
);
--> statement-breakpoint
CREATE TABLE `apiLogs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`endpoint` varchar(100) NOT NULL,
	`action` varchar(50) NOT NULL,
	`requestParams` text,
	`response` text,
	`statusCode` int,
	`success` boolean NOT NULL DEFAULT false,
	`errorMessage` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `apiLogs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `balance_transactions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`customerId` int NOT NULL,
	`amount` int NOT NULL,
	`type` enum('credit','debit','purchase','refund','withdrawal','hold') NOT NULL,
	`description` text,
	`balanceBefore` int NOT NULL,
	`balanceAfter` int NOT NULL,
	`relatedActivationId` int,
	`createdBy` int,
	`origin` enum('api','customer','admin','system') NOT NULL DEFAULT 'system',
	`ipAddress` varchar(45),
	`metadata` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `balance_transactions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `countries` (
	`id` int AUTO_INCREMENT NOT NULL,
	`smshubId` int NOT NULL,
	`name` varchar(100) NOT NULL,
	`code` varchar(50) NOT NULL,
	`active` boolean NOT NULL DEFAULT true,
	`markupPercentage` int NOT NULL DEFAULT 0,
	`markupFixed` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `countries_id` PRIMARY KEY(`id`),
	CONSTRAINT `countries_smshubId_unique` UNIQUE(`smshubId`)
);
--> statement-breakpoint
CREATE TABLE `customer_favorites` (
	`id` int AUTO_INCREMENT NOT NULL,
	`customerId` int NOT NULL,
	`serviceId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `customer_favorites_id` PRIMARY KEY(`id`),
	CONSTRAINT `customer_service_fav_idx` UNIQUE(`customerId`,`serviceId`)
);
--> statement-breakpoint
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
CREATE TABLE `customers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`pin` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`email` varchar(320) NOT NULL,
	`password` varchar(255),
	`balance` int NOT NULL DEFAULT 0,
	`bonusBalance` int NOT NULL DEFAULT 0,
	`referredBy` int,
	`active` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `customers_id` PRIMARY KEY(`id`),
	CONSTRAINT `customers_pin_unique` UNIQUE(`pin`),
	CONSTRAINT `customers_email_unique` UNIQUE(`email`)
);
--> statement-breakpoint
CREATE TABLE `operators` (
	`id` int AUTO_INCREMENT NOT NULL,
	`countryId` int NOT NULL,
	`code` varchar(50) NOT NULL,
	`name` varchar(100) NOT NULL,
	`active` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `operators_id` PRIMARY KEY(`id`),
	CONSTRAINT `country_code_idx` UNIQUE(`countryId`,`code`)
);
--> statement-breakpoint
CREATE TABLE `payment_settings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`pix_enabled` boolean NOT NULL DEFAULT true,
	`stripe_enabled` boolean NOT NULL DEFAULT true,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `payment_settings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `pix_transactions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`customerId` int NOT NULL,
	`txid` varchar(100) NOT NULL,
	`amount` int NOT NULL,
	`status` enum('pending','paid','expired','cancelled') NOT NULL DEFAULT 'pending',
	`pixCopyPaste` text,
	`qrCodeUrl` varchar(500),
	`expiresAt` timestamp NOT NULL,
	`paidAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `pix_transactions_id` PRIMARY KEY(`id`),
	CONSTRAINT `pix_transactions_txid_unique` UNIQUE(`txid`),
	CONSTRAINT `pix_txid_idx` UNIQUE(`txid`)
);
--> statement-breakpoint
CREATE TABLE `priceHistory` (
	`id` int AUTO_INCREMENT NOT NULL,
	`countryId` int NOT NULL,
	`serviceId` int NOT NULL,
	`smshubPrice` int NOT NULL,
	`ourPrice` int NOT NULL,
	`changedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `priceHistory_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `prices` (
	`id` int AUTO_INCREMENT NOT NULL,
	`apiId` int,
	`countryId` int NOT NULL,
	`serviceId` int NOT NULL,
	`smshubPrice` int NOT NULL,
	`ourPrice` int NOT NULL,
	`fixedPrice` boolean NOT NULL DEFAULT false,
	`quantityAvailable` int NOT NULL DEFAULT 0,
	`active` boolean NOT NULL DEFAULT true,
	`lastSync` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `prices_id` PRIMARY KEY(`id`),
	CONSTRAINT `country_service_api_idx` UNIQUE(`countryId`,`serviceId`,`apiId`)
);
--> statement-breakpoint
CREATE TABLE `recharges` (
	`id` int AUTO_INCREMENT NOT NULL,
	`customerId` int NOT NULL,
	`amount` int NOT NULL,
	`paymentMethod` enum('pix','card','crypto','picpay') NOT NULL,
	`status` enum('completed','pending','expired') NOT NULL DEFAULT 'pending',
	`transactionId` varchar(255),
	`metadata` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`completedAt` timestamp,
	`expiresAt` timestamp,
	CONSTRAINT `recharges_id` PRIMARY KEY(`id`)
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
CREATE TABLE `services` (
	`id` int AUTO_INCREMENT NOT NULL,
	`smshubCode` varchar(50) NOT NULL,
	`name` varchar(200) NOT NULL,
	`category` varchar(100),
	`active` boolean NOT NULL DEFAULT true,
	`markupPercentage` int NOT NULL DEFAULT 0,
	`markupFixed` int NOT NULL DEFAULT 0,
	`totalSales` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `services_id` PRIMARY KEY(`id`),
	CONSTRAINT `services_smshubCode_unique` UNIQUE(`smshubCode`)
);
--> statement-breakpoint
CREATE TABLE `settings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`key` varchar(100) NOT NULL,
	`value` text,
	`description` text,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `settings_id` PRIMARY KEY(`id`),
	CONSTRAINT `settings_key_unique` UNIQUE(`key`)
);
--> statement-breakpoint
CREATE TABLE `sms_apis` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`url` varchar(500) NOT NULL,
	`token` varchar(500) NOT NULL,
	`active` boolean NOT NULL DEFAULT true,
	`priority` int NOT NULL DEFAULT 0,
	`currency` enum('BRL','USD') NOT NULL DEFAULT 'USD',
	`exchange_rate` decimal(6,2) NOT NULL DEFAULT '1.00',
	`profit_percentage` decimal(5,2) NOT NULL DEFAULT '0.00',
	`minimum_price` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `sms_apis_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `sms_messages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`activationId` int NOT NULL,
	`code` varchar(100) NOT NULL,
	`fullText` text,
	`receivedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `sms_messages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `stripe_transactions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`customerId` int NOT NULL,
	`sessionId` varchar(255) NOT NULL,
	`paymentIntentId` varchar(255),
	`amount` int NOT NULL,
	`status` enum('pending','completed','expired','cancelled') NOT NULL DEFAULT 'pending',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `stripe_transactions_id` PRIMARY KEY(`id`),
	CONSTRAINT `stripe_transactions_sessionId_unique` UNIQUE(`sessionId`),
	CONSTRAINT `stripe_session_id_idx` UNIQUE(`sessionId`)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` int AUTO_INCREMENT NOT NULL,
	`openId` varchar(64) NOT NULL,
	`name` text,
	`email` varchar(320),
	`loginMethod` varchar(64),
	`role` enum('user','admin') NOT NULL DEFAULT 'user',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`lastSignedIn` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_openId_unique` UNIQUE(`openId`)
);
--> statement-breakpoint
ALTER TABLE `prices` ADD CONSTRAINT `prices_apiId_sms_apis_id_fk` FOREIGN KEY (`apiId`) REFERENCES `sms_apis`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `user_id_idx` ON `activations` (`userId`);--> statement-breakpoint
CREATE INDEX `status_idx` ON `activations` (`status`);--> statement-breakpoint
CREATE INDEX `created_at_idx` ON `activations` (`createdAt`);--> statement-breakpoint
CREATE INDEX `external_order_idx` ON `activations` (`externalOrderId`);--> statement-breakpoint
CREATE INDEX `position_idx` ON `admin_menus` (`position`);--> statement-breakpoint
CREATE INDEX `action_idx` ON `apiLogs` (`action`);--> statement-breakpoint
CREATE INDEX `created_at_idx` ON `apiLogs` (`createdAt`);--> statement-breakpoint
CREATE INDEX `customer_idx` ON `balance_transactions` (`customerId`);--> statement-breakpoint
CREATE INDEX `type_idx` ON `balance_transactions` (`type`);--> statement-breakpoint
CREATE INDEX `created_at_idx` ON `balance_transactions` (`createdAt`);--> statement-breakpoint
CREATE INDEX `related_activation_idx` ON `balance_transactions` (`relatedActivationId`);--> statement-breakpoint
CREATE INDEX `code_idx` ON `countries` (`code`);--> statement-breakpoint
CREATE INDEX `customer_fav_idx` ON `customer_favorites` (`customerId`);--> statement-breakpoint
CREATE INDEX `session_customer_idx` ON `customer_sessions` (`customerId`);--> statement-breakpoint
CREATE INDEX `session_is_active_idx` ON `customer_sessions` (`isActive`);--> statement-breakpoint
CREATE INDEX `session_login_at_idx` ON `customer_sessions` (`loginAt`);--> statement-breakpoint
CREATE INDEX `email_idx` ON `customers` (`email`);--> statement-breakpoint
CREATE INDEX `pin_idx` ON `customers` (`pin`);--> statement-breakpoint
CREATE INDEX `pix_customer_idx` ON `pix_transactions` (`customerId`);--> statement-breakpoint
CREATE INDEX `pix_status_idx` ON `pix_transactions` (`status`);--> statement-breakpoint
CREATE INDEX `pix_created_at_idx` ON `pix_transactions` (`createdAt`);--> statement-breakpoint
CREATE INDEX `country_service_hist_idx` ON `priceHistory` (`countryId`,`serviceId`);--> statement-breakpoint
CREATE INDEX `changed_at_idx` ON `priceHistory` (`changedAt`);--> statement-breakpoint
CREATE INDEX `api_idx` ON `prices` (`apiId`);--> statement-breakpoint
CREATE INDEX `last_sync_idx` ON `prices` (`lastSync`);--> statement-breakpoint
CREATE INDEX `recharge_customer_idx` ON `recharges` (`customerId`);--> statement-breakpoint
CREATE INDEX `recharge_status_idx` ON `recharges` (`status`);--> statement-breakpoint
CREATE INDEX `recharge_created_at_idx` ON `recharges` (`createdAt`);--> statement-breakpoint
CREATE INDEX `recharge_payment_method_idx` ON `recharges` (`paymentMethod`);--> statement-breakpoint
CREATE INDEX `affiliate_idx` ON `referral_earnings` (`affiliateId`);--> statement-breakpoint
CREATE INDEX `referral_earning_idx` ON `referral_earnings` (`referralId`);--> statement-breakpoint
CREATE INDEX `earning_created_at_idx` ON `referral_earnings` (`createdAt`);--> statement-breakpoint
CREATE INDEX `referrer_idx` ON `referrals` (`referrerId`);--> statement-breakpoint
CREATE INDEX `referral_status_idx` ON `referrals` (`status`);--> statement-breakpoint
CREATE INDEX `category_idx` ON `services` (`category`);--> statement-breakpoint
CREATE INDEX `total_sales_idx` ON `services` (`totalSales`);--> statement-breakpoint
CREATE INDEX `priority_idx` ON `sms_apis` (`priority`);--> statement-breakpoint
CREATE INDEX `active_idx` ON `sms_apis` (`active`);--> statement-breakpoint
CREATE INDEX `sms_activation_idx` ON `sms_messages` (`activationId`);--> statement-breakpoint
CREATE INDEX `sms_received_at_idx` ON `sms_messages` (`receivedAt`);--> statement-breakpoint
CREATE INDEX `stripe_customer_idx` ON `stripe_transactions` (`customerId`);--> statement-breakpoint
CREATE INDEX `stripe_status_idx` ON `stripe_transactions` (`status`);--> statement-breakpoint
CREATE INDEX `stripe_created_at_idx` ON `stripe_transactions` (`createdAt`);