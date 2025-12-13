CREATE TABLE `api_performance_stats` (
	`id` int AUTO_INCREMENT NOT NULL,
	`apiId` int NOT NULL,
	`date` varchar(10) NOT NULL,
	`totalActivations` int NOT NULL DEFAULT 0,
	`completed` int NOT NULL DEFAULT 0,
	`cancelled` int NOT NULL DEFAULT 0,
	`expired` int NOT NULL DEFAULT 0,
	`successRate` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `api_performance_stats_id` PRIMARY KEY(`id`),
	CONSTRAINT `api_date_idx` UNIQUE(`apiId`,`date`)
);
--> statement-breakpoint
CREATE INDEX `api_idx` ON `api_performance_stats` (`apiId`);--> statement-breakpoint
CREATE INDEX `date_idx` ON `api_performance_stats` (`date`);