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
CREATE INDEX `position_idx` ON `admin_menus` (`position`);