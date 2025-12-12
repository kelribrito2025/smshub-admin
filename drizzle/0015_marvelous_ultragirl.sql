ALTER TABLE `payment_settings` ADD `pix_min_amount` int DEFAULT 1000 NOT NULL;--> statement-breakpoint
ALTER TABLE `payment_settings` ADD `pix_bonus_percentage` int DEFAULT 5 NOT NULL;--> statement-breakpoint
ALTER TABLE `payment_settings` ADD `stripe_min_amount` int DEFAULT 2000 NOT NULL;--> statement-breakpoint
ALTER TABLE `payment_settings` ADD `stripe_bonus_percentage` int DEFAULT 0 NOT NULL;