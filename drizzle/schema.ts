import { mysqlTable, int, varchar, text, json, timestamp, mysqlEnum, boolean, decimal } from "drizzle-orm/mysql-core";

// ─── Users ─────────────────────────────────────────────────────
export const users = mysqlTable("users", {
  id: int("id").primaryKey().autoincrement(),
  openId: varchar("open_id", { length: 255 }).unique().notNull(),
  name: varchar("name", { length: 255 }),
  email: varchar("email", { length: 255 }),
  loginMethod: varchar("login_method", { length: 50 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user"),
  subscriptionPlan: mysqlEnum("subscription_plan", ["free", "monthly", "yearly"]).default("free"),
  subscriptionExpiresAt: timestamp("subscription_expires_at"),
  storiesUsed: int("stories_used").default(0),
  stripeCustomerId: varchar("stripe_customer_id", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
  lastSignedIn: timestamp("last_signed_in"),
});

// ─── Children ──────────────────────────────────────────────────
export const children = mysqlTable("children", {
  id: int("id").primaryKey().autoincrement(),
  userId: int("user_id").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  nickname: varchar("nickname", { length: 255 }),
  age: int("age").notNull(),
  gender: varchar("gender", { length: 50 }),
  hairColor: varchar("hair_color", { length: 50 }),
  skinTone: varchar("skin_tone", { length: 50 }),
  interests: json("interests").$type<string[]>().default([]),
  avatarUrl: varchar("avatar_url", { length: 1024 }),
  favoriteColor: varchar("favorite_color", { length: 50 }),
  personalityTraits: json("personality_traits").$type<string[]>(),
  fears: json("fears").$type<string[]>(),
  readingLevel: varchar("reading_level", { length: 50 }),
  language: varchar("language", { length: 50 }).default("English"),
  bedtime: varchar("bedtime", { length: 20 }),
  favoriteCharacter: varchar("favorite_character", { length: 255 }),
  // Neurodivergent support
  isNeurodivergent: boolean("is_neurodivergent").default(false),
  neurodivergentProfiles: json("neurodivergent_profiles").$type<{
    type: string;
    sensoryPreferences?: string[];
    communicationStyle?: string;
    storyPacing?: string;
    customNotes?: string;
  }[]>(),
  sensoryPreferences: json("sensory_preferences").$type<string[]>(),
  communicationStyle: varchar("communication_style", { length: 255 }),
  storyPacing: varchar("story_pacing", { length: 50 }),
  allergiesOrTriggers: json("allergies_or_triggers").$type<string[]>(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
});

// ─── Story Arcs ────────────────────────────────────────────────
export const storyArcs = mysqlTable("story_arcs", {
  id: int("id").primaryKey().autoincrement(),
  userId: int("user_id").notNull(),
  childId: int("child_id").notNull(),
  title: varchar("title", { length: 512 }).notNull(),
  theme: varchar("theme", { length: 255 }).notNull(),
  educationalValue: varchar("educational_value", { length: 255 }),
  totalEpisodes: int("total_episodes").default(5),
  currentEpisode: int("current_episode").default(0),
  coverImageUrl: varchar("cover_image_url", { length: 1024 }),
  synopsis: text("synopsis"),
  status: mysqlEnum("status", ["active", "completed", "paused"]).default("active"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
});

// ─── Episodes ──────────────────────────────────────────────────
export const episodes = mysqlTable("episodes", {
  id: int("id").primaryKey().autoincrement(),
  storyArcId: int("story_arc_id").notNull(),
  episodeNumber: int("episode_number").notNull(),
  title: varchar("title", { length: 512 }),
  summary: text("summary"),
  coverImageUrl: varchar("cover_image_url", { length: 1024 }),
  isRead: boolean("is_read").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// ─── Pages ─────────────────────────────────────────────────────
export const pages = mysqlTable("pages", {
  id: int("id").primaryKey().autoincrement(),
  episodeId: int("episode_id").notNull(),
  pageNumber: int("page_number").notNull(),
  storyText: text("story_text"),
  imageUrl: varchar("image_url", { length: 1024 }),
  imagePrompt: text("image_prompt"),
  printReadyImageUrl: varchar("print_ready_image_url", { length: 1024 }),
  audioUrl: varchar("audio_url", { length: 1024 }),
  audioDurationMs: int("audio_duration_ms"),
  mood: varchar("mood", { length: 50 }),
  characters: json("characters").$type<{ name: string; traits: string[]; voiceRole?: string }[]>(),
  createdAt: timestamp("created_at").defaultNow(),
});

// ─── Story Recommendations ─────────────────────────────────────
export const storyRecommendations = mysqlTable("story_recommendations", {
  id: int("id").primaryKey().autoincrement(),
  userId: int("user_id").notNull(),
  childId: int("child_id").notNull(),
  title: varchar("title", { length: 512 }).notNull(),
  theme: varchar("theme", { length: 255 }),
  educationalValue: varchar("educational_value", { length: 255 }),
  synopsis: text("synopsis"),
  imageUrl: varchar("image_url", { length: 1024 }),
  imagePrompt: text("image_prompt"),
  whyRecommended: text("why_recommended"),
  estimatedEpisodes: int("estimated_episodes").default(5),
  isUsed: boolean("is_used").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// ─── Print Orders (Printful) ───────────────────────────────────
export const printOrders = mysqlTable("print_orders", {
  id: int("id").primaryKey().autoincrement(),
  userId: int("user_id").notNull(),
  storyArcId: int("story_arc_id").notNull(),
  episodeId: int("episode_id"),
  printfulOrderId: varchar("printful_order_id", { length: 255 }),
  printfulSyncProductId: varchar("printful_sync_product_id", { length: 255 }),
  bookFormat: varchar("book_format", { length: 50 }).notNull(),
  pageCount: int("page_count"),
  coverImageUrl: varchar("cover_image_url", { length: 1024 }),
  interiorPdfUrl: varchar("interior_pdf_url", { length: 1024 }),
  status: mysqlEnum("order_status", [
    "draft",
    "generating_pdf",
    "pdf_ready",
    "submitted",
    "in_production",
    "shipped",
    "delivered",
    "cancelled",
    "failed",
  ]).default("draft"),
  shippingName: varchar("shipping_name", { length: 255 }),
  shippingAddress: text("shipping_address"),
  shippingCity: varchar("shipping_city", { length: 255 }),
  shippingState: varchar("shipping_state", { length: 100 }),
  shippingZip: varchar("shipping_zip", { length: 20 }),
  shippingCountry: varchar("shipping_country", { length: 100 }),
  subtotal: decimal("subtotal", { precision: 10, scale: 2 }),
  shippingCost: decimal("shipping_cost", { precision: 10, scale: 2 }),
  discount: decimal("discount", { precision: 10, scale: 2 }),
  total: decimal("total", { precision: 10, scale: 2 }),
  currency: varchar("currency", { length: 10 }).default("USD"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
});

// ─── Type Exports ──────────────────────────────────────────────
export type User = typeof users.$inferSelect;
export type Child = typeof children.$inferSelect;
export type StoryArc = typeof storyArcs.$inferSelect;
export type Episode = typeof episodes.$inferSelect;
export type Page = typeof pages.$inferSelect;
export type StoryRecommendation = typeof storyRecommendations.$inferSelect;
export type PrintOrder = typeof printOrders.$inferSelect;
