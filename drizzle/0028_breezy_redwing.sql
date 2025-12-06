ALTER TABLE `services` ADD `totalSales` int DEFAULT 0 NOT NULL;--> statement-breakpoint
CREATE INDEX `total_sales_idx` ON `services` (`totalSales`);