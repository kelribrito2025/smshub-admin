CREATE TABLE `customer_favorites` (
	`id` int AUTO_INCREMENT NOT NULL,
	`customerId` int NOT NULL,
	`serviceId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `customer_favorites_id` PRIMARY KEY(`id`),
	CONSTRAINT `customer_service_fav_idx` UNIQUE(`customerId`,`serviceId`)
);
--> statement-breakpoint
CREATE INDEX `customer_fav_idx` ON `customer_favorites` (`customerId`);