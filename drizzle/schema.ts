import { boolean, int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

// Children profiles created by parents
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
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

// Story arcs - a series of episodic stories
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

// Individual episodes within a story arc
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

// Pages within an episode (each has text + illustration)
export const pages = mysqlTable("pages", {
  id: int("id").autoincrement().primaryKey(),
  episodeId: int("episodeId").notNull(),
  pageNumber: int("pageNumber").notNull(),
  storyText: text("storyText").notNull(),
  imageUrl: text("imageUrl"),
  imagePrompt: text("imagePrompt"),
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
