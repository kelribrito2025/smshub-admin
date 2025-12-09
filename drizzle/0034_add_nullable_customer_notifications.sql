-- Migration: Allow customerId to be NULL for global notifications
-- Created: 2025-12-09

ALTER TABLE `notifications` 
MODIFY COLUMN `customerId` INT NULL;

-- Add index for global notifications (customerId IS NULL)
CREATE INDEX `notification_global_idx` ON `notifications` (`customerId`, `createdAt`) WHERE `customerId` IS NULL;
