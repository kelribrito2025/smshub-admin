ALTER TABLE `customers` ADD `pin` int NOT NULL;--> statement-breakpoint
ALTER TABLE `customers` ADD CONSTRAINT `customers_pin_unique` UNIQUE(`pin`);--> statement-breakpoint
CREATE INDEX `pin_idx` ON `customers` (`pin`);