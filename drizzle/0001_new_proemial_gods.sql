CREATE TABLE `children` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(100) NOT NULL,
	`age` int NOT NULL,
	`gender` varchar(20),
	`hairColor` varchar(30),
	`skinTone` varchar(30),
	`interests` text,
	`avatarUrl` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `children_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `episodes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`storyArcId` int NOT NULL,
	`episodeNumber` int NOT NULL,
	`title` varchar(255) NOT NULL,
	`summary` text,
	`coverImageUrl` text,
	`isRead` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `episodes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `pages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`episodeId` int NOT NULL,
	`pageNumber` int NOT NULL,
	`storyText` text NOT NULL,
	`imageUrl` text,
	`imagePrompt` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `pages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `story_arcs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`childId` int NOT NULL,
	`title` varchar(255) NOT NULL,
	`theme` varchar(50) NOT NULL,
	`educationalValue` varchar(50) NOT NULL,
	`totalEpisodes` int NOT NULL DEFAULT 10,
	`currentEpisode` int NOT NULL DEFAULT 0,
	`coverImageUrl` text,
	`synopsis` text,
	`status` enum('active','completed','paused') NOT NULL DEFAULT 'active',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `story_arcs_id` PRIMARY KEY(`id`)
);
