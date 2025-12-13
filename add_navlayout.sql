ALTER TABLE users ADD COLUMN navLayout ENUM('sidebar', 'top') NOT NULL DEFAULT 'sidebar' AFTER permissions;
