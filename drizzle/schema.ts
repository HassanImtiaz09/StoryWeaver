import { boolean, int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export const children = mysqlTable("children", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  name: varchar("name", { length: 100 }).notNull(),
  age: int("age").notNull(),
  gender: varchar("gender", { length: 20 }),
  hairColor: varchar("hairColor", { length: 30 }),
  skinTone: varchar("skinTone", { length: 30 }),
  interests: text("interests"),
  avatarUrl: text("avatarUrl"),
  favoriteColor: varchar("favoriteColor", { length: 30 }),
  personalityTraits: text("personalityTraits"),
  fears: text("fears"),
  readingLevel: varchar("readingLevel", { length: 30 }),
  language: varchar("language", { length: 10 }).default("en"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const storyArcs = mysqlTable("story_arcs", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  childId: int("childId").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  theme: varchar("theme", { length: 50 }).notNull(),
  educationalValue: varchar("educationalValue", { length: 50 }).notNull(),
  totalEpisodes: int("totalEpisodes").notNull().default(10),
  currentEpisode: int("currentEpisode").notNull().default(0),
  coverImageUrl: text("coverImageUrl"),
  synopsis: text("synopsis"),
  status: mysqlEnum("status", ["active", "completed", "paused"]).default("active").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const episodes = mysqlTable("episodes", {
  id: int("id").autoincrement().primaryKey(),
  storyArcId: int("storyArcId").notNull(),
  episodeNumber: int("episodeNumber").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  summary: text("summary"),
  coverImageUrl: text("coverImageUrl"),
  isRead: boolean("isRead").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const pages = mysqlTable("pages", {
  id: int("id").autoincrement().primaryKey(),
  episodeId: int("episodeId").notNull(),
  pageNumber: int("pageNumber").notNull(),
  storyText: text("storyText").notNull(),
  imageUrl: text("imageUrl"),
  imagePrompt: text("imagePrompt"),
  audioUrl: text("audioUrl"),
  audioDurationMs: int("audioDurationMs"),
  mood: varchar("mood", { length: 30 }),
  characters: text("characters"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const storyRecommendations = mysqlTable("story_recommendations", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  childId: int("childId").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  theme: varchar("theme", { length: 50 }).notNull(),
  educationalValue: varchar("educationalValue", { length: 50 }).notNull(),
  synopsis: text("synopsis"),
  imageUrl: text("imageUrl"),
  imagePrompt: text("imagePrompt"),
  whyRecommended: text("whyRecommended"),
  estimatedEpisodes: int("estimatedEpisodes").default(7),
  isUsed: boolean("isUsed").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type Child = typeof children.$inferSelect;
export type InsertChild = typeof children.$inferInsert;
export type StoryArc = typeof storyArcs.$inferSelect;
export type InsertStoryArc = typeof storyArcs.$inferInsert;
export type Episode = typeof episodes.$inferSelect;
export type InsertEpisode = typeof episodes.$inferInsert;
export type Page = typeof pages.$inferSelect;
export type InsertPage = typeof pages.$inferInsert;
export type StoryRecommendation = typeof storyRecommendations.$inferSelect;
export type InsertStoryRecommendation = typeof storyRecommendations.$inferInsert;
