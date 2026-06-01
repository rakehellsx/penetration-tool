CREATE TABLE `ai_sessions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`archived` boolean NOT NULL DEFAULT false,
	`contextProjectId` int,
	`contextFileId` int,
	`messages` json,
	`totalTokens` int DEFAULT 0,
	`ownerId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `ai_sessions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `ai_usage_stats` (
	`id` int AUTO_INCREMENT NOT NULL,
	`date` varchar(16) NOT NULL,
	`callCount` int NOT NULL DEFAULT 0,
	`tokenCount` int NOT NULL DEFAULT 0,
	`promptTokens` int NOT NULL DEFAULT 0,
	`completionTokens` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `ai_usage_stats_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `audit_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int,
	`userName` varchar(255),
	`action` varchar(128) NOT NULL,
	`module` varchar(64) NOT NULL,
	`resourceId` int,
	`resourceName` varchar(255),
	`details` json,
	`ipAddress` varchar(64),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `audit_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `builds` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`name` varchar(255),
	`platform` varchar(64) NOT NULL,
	`status` enum('pending','running','success','failed','cancelled') NOT NULL DEFAULT 'pending',
	`pipeline` json,
	`buildLog` text,
	`artifactKey` varchar(512),
	`artifactSize` int,
	`artifactHash` varchar(128),
	`avScore` float,
	`avDetections` int,
	`avTotal` int,
	`linkedPayloadId` int,
	`duration` int,
	`ownerId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `builds_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `code_snippets` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`language` varchar(64) NOT NULL,
	`code` text NOT NULL,
	`category` varchar(128),
	`tags` json,
	`isBuiltin` boolean NOT NULL DEFAULT false,
	`ownerId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `code_snippets_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `payloads` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`os` enum('windows','linux','macos','cross') NOT NULL,
	`arch` enum('x64','x86','arm64','arm') NOT NULL DEFAULT 'x64',
	`payloadType` enum('shellcode','exe','dll','script','other') NOT NULL,
	`listenType` enum('reverse_shell','bind','http','dns','other'),
	`lhost` varchar(255),
	`lport` int,
	`encoding` varchar(128),
	`obfuscation` varchar(128),
	`encryption` varchar(128),
	`avScore` float,
	`avDetections` int,
	`avTotal` int,
	`avScanResult` json,
	`tags` json,
	`notes` text,
	`storageKey` varchar(512),
	`fileSize` int,
	`fileHash` varchar(128),
	`ownerId` int NOT NULL,
	`parentId` int,
	`generationParams` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `payloads_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `project_files` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`path` varchar(1024) NOT NULL,
	`name` varchar(255) NOT NULL,
	`content` text,
	`language` varchar(64),
	`storageKey` varchar(512),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `project_files_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `project_members` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`userId` int NOT NULL,
	`permission` enum('readonly','editor','admin') NOT NULL DEFAULT 'readonly',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `project_members_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `projects` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`platform` varchar(64),
	`language` varchar(64),
	`status` enum('active','archived','draft') NOT NULL DEFAULT 'active',
	`tags` json,
	`ownerId` int NOT NULL,
	`linkedPayloadIds` json,
	`linkedTemplateIds` json,
	`buildConfig` json,
	`fileStorageKey` varchar(512),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `projects_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `system_settings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`key` varchar(128) NOT NULL,
	`value` text,
	`category` varchar(64),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `system_settings_id` PRIMARY KEY(`id`),
	CONSTRAINT `system_settings_key_unique` UNIQUE(`key`)
);
--> statement-breakpoint
CREATE TABLE `template_versions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`templateId` int NOT NULL,
	`version` int NOT NULL,
	`codeTemplate` text,
	`parameters` json,
	`changelog` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `template_versions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `templates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`category` enum('injection','privilege_escalation','lateral_movement','persistence','recon','evasion','other') NOT NULL,
	`platform` varchar(64),
	`language` varchar(64),
	`mitreAttack` json,
	`codeTemplate` text,
	`parameters` json,
	`isBuiltin` boolean NOT NULL DEFAULT false,
	`tags` json,
	`ownerId` int,
	`storageKey` varchar(512),
	`version` int NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `templates_id` PRIMARY KEY(`id`)
);
