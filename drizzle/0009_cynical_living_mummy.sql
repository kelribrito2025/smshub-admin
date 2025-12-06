DROP INDEX `country_service_idx` ON `prices`;--> statement-breakpoint
ALTER TABLE `prices` ADD CONSTRAINT `country_service_api_idx` UNIQUE(`countryId`,`serviceId`,`apiId`);