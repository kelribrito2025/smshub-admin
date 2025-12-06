ALTER TABLE `prices` DROP INDEX `country_service_idx`;--> statement-breakpoint
ALTER TABLE `prices` ADD `apiId` int;--> statement-breakpoint
CREATE INDEX `country_service_idx` ON `prices` (`countryId`,`serviceId`);--> statement-breakpoint
CREATE INDEX `api_idx` ON `prices` (`apiId`);