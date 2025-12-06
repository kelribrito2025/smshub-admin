CREATE TABLE `activations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`smshubActivationId` varchar(50),
	`userId` int,
	`serviceId` int NOT NULL,
	`countryId` int NOT NULL,
	`phoneNumber` varchar(20),
	`status` enum('pending','active','completed','cancelled','failed') NOT NULL DEFAULT 'pending',
	`smsCode` varchar(20),
	`smshubCost` int NOT NULL DEFAULT 0,
	`sellingPrice` int NOT NULL DEFAULT 0,
	`profit` int NOT NULL DEFAULT 0,
	`externalOrderId` varchar(100),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`completedAt` timestamp,
	CONSTRAINT `activations_id` PRIMARY KEY(`id`)
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
	`countryId` int NOT NULL,
	`serviceId` int NOT NULL,
	`smshubPrice` int NOT NULL,
	`ourPrice` int NOT NULL,
	`quantityAvailable` int NOT NULL DEFAULT 0,
	`lastSync` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `prices_id` PRIMARY KEY(`id`),
	CONSTRAINT `country_service_idx` UNIQUE(`countryId`,`serviceId`)
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
CREATE INDEX `user_id_idx` ON `activations` (`userId`);--> statement-breakpoint
CREATE INDEX `status_idx` ON `activations` (`status`);--> statement-breakpoint
CREATE INDEX `created_at_idx` ON `activations` (`createdAt`);--> statement-breakpoint
CREATE INDEX `external_order_idx` ON `activations` (`externalOrderId`);--> statement-breakpoint
CREATE INDEX `action_idx` ON `apiLogs` (`action`);--> statement-breakpoint
CREATE INDEX `created_at_idx` ON `apiLogs` (`createdAt`);--> statement-breakpoint
CREATE INDEX `code_idx` ON `countries` (`code`);--> statement-breakpoint
CREATE INDEX `country_service_hist_idx` ON `priceHistory` (`countryId`,`serviceId`);--> statement-breakpoint
CREATE INDEX `changed_at_idx` ON `priceHistory` (`changedAt`);--> statement-breakpoint
CREATE INDEX `last_sync_idx` ON `prices` (`lastSync`);--> statement-breakpoint
CREATE INDEX `category_idx` ON `services` (`category`);