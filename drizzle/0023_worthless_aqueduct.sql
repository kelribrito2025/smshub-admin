ALTER TABLE `sms_apis` ADD `currency` enum('BRL','USD') DEFAULT 'USD' NOT NULL;--> statement-breakpoint
ALTER TABLE `sms_apis` ADD `exchange_rate` decimal(6,2) DEFAULT '1.00' NOT NULL;--> statement-breakpoint
ALTER TABLE `sms_apis` ADD `profit_percentage` decimal(5,2) DEFAULT '0.00' NOT NULL;--> statement-breakpoint
ALTER TABLE `sms_apis` ADD `minimum_price` int DEFAULT 0 NOT NULL;