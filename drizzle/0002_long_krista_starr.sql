ALTER TABLE `ai_sessions` MODIFY COLUMN `messages` json;--> statement-breakpoint
ALTER TABLE `builds` MODIFY COLUMN `pipeline` json;--> statement-breakpoint
ALTER TABLE `code_snippets` MODIFY COLUMN `tags` json;--> statement-breakpoint
ALTER TABLE `payloads` MODIFY COLUMN `tags` json;--> statement-breakpoint
ALTER TABLE `projects` MODIFY COLUMN `tags` json;--> statement-breakpoint
ALTER TABLE `projects` MODIFY COLUMN `linkedPayloadIds` json;--> statement-breakpoint
ALTER TABLE `projects` MODIFY COLUMN `linkedTemplateIds` json;--> statement-breakpoint
ALTER TABLE `projects` MODIFY COLUMN `buildConfig` json;--> statement-breakpoint
ALTER TABLE `template_versions` MODIFY COLUMN `parameters` json;--> statement-breakpoint
ALTER TABLE `templates` MODIFY COLUMN `mitreAttack` json;--> statement-breakpoint
ALTER TABLE `templates` MODIFY COLUMN `parameters` json;--> statement-breakpoint
ALTER TABLE `templates` MODIFY COLUMN `tags` json;