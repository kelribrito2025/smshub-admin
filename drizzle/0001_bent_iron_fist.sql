ALTER TABLE `customers` ADD `banned` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `customers` ADD `bannedAt` timestamp;--> statement-breakpoint
ALTER TABLE `customers` ADD `bannedReason` text;