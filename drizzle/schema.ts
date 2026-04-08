import { mysqlTable, int, varchar, text, json, timestamp, mysqlEnum, boolean, decimal } from "drizzle-orm/mysql-core";

// ─── Users ─────────────────────────────────────────────────────

export const users = mysqlTable("users", {
  id: int("id").primaryKey().autoincrement(),
  openId: varchar("open_id", { length: 255 }).unique().notNull(),
  name: varchar("name", { length: 255 }),
  email: varchar("email", { length: 255 }),
  loginMethod: varchar("login_method", { length: 50 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user"),
  subscriptionPlan: mysqlEnum("subscription_plan", ["free", "monthly", "yearly", "family"]).default("free"),
  subscriptionExpiresAt: timestamp("subscription_expires_at"),
  storiesUsed: int("stories_used").default(0),
  stripeCustomerId: varchar("stripe_customer_id", { length: 255 }),
  stripeSubscriptionId: varchar("stripe_subscription_id", { length: 255 }),
  subscriptionStatus: varchar("subscription_status", { length: 50 }).default("none"),
  // COPPA Compliance fields
  consentVerifiedAt: timestamp("consent_verified_at"),
  consentMethod: varchar("consent_method", { length: 50 }),
  isParent: boolean("is_parent").default(false),
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
  // Continuous episode-level audio (all pages narrated as one track)
  fullAudioUrl: varchar("full_audio_url", { length: 1024 }),
  fullAudioDurationMs: int("full_audio_duration_ms"),
  // Page timing data for syncing page transitions with continuous audio
  pageTimings: json("page_timings").$type<{
    pageNumber: number;
    startMs: number;
    endMs: number;
  }[]>(),
  // Background music
  musicUrl: varchar("music_url", { length: 1024 }),
  musicDurationMs: int("music_duration_ms"),
  musicMood: varchar("music_mood", { length: 50 }),
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
  // Scene metadata for image generation and sound effects
  sceneDescription: text("scene_description"),
  soundEffectHint: text("sound_effect_hint"),
  soundEffectUrl: varchar("sound_effect_url", { length: 1024 }),
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

// ─── Book Products Catalog ────────────────────────────────────

export const bookProducts = mysqlTable("book_products", {
  id: int("id").primaryKey().autoincrement(),
  storyArcId: int("story_arc_id").notNull(),
  userId: int("user_id").notNull(),
  childId: int("child_id").notNull(),
  title: varchar("title", { length: 300 }).notNull(),
  format: varchar("format", { length: 50 }).notNull(), // "softcover", "hardcover"
  size: varchar("size", { length: 20 }).notNull(), // "6x9", "8x10", "8.5x11"
  pageCount: int("page_count").notNull(),
  coverImageUrl: varchar("cover_image_url", { length: 500 }),
  interiorPdfUrl: varchar("interior_pdf_url", { length: 500 }),
  printfulProductId: varchar("printful_product_id", { length: 200 }),
  status: varchar("status", { length: 50 }).default("draft").notNull(), // "draft", "ready", "submitted"
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─── Shipping Addresses ────────────────────────────────────────

export const shippingAddresses = mysqlTable("shipping_addresses", {
  id: int("id").primaryKey().autoincrement(),
  userId: int("user_id").notNull(),
  name: varchar("name", { length: 200 }).notNull(),
  address1: varchar("address1", { length: 300 }).notNull(),
  address2: varchar("address2", { length: 300 }),
  city: varchar("city", { length: 100 }).notNull(),
  stateCode: varchar("state_code", { length: 10 }),
  countryCode: varchar("country_code", { length: 5 }).notNull(),
  zip: varchar("zip", { length: 20 }).notNull(),
  phone: varchar("phone", { length: 30 }),
  isDefault: boolean("is_default").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
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

// ─── Content Moderation Log ────────────────────────────────────

export const contentModerationLog = mysqlTable("content_moderation_log", {
  id: int("id").primaryKey().autoincrement(),
  episodeId: int("episode_id"),
  userId: int("user_id").notNull(),
  childId: int("child_id").notNull(),
  contentType: varchar("content_type", { length: 50 }).notNull(),
  approved: boolean("approved").notNull(),
  flaggedItems: json("flagged_items").$type<
    { text: string; reason: string; severity: string }[]
  >(),
  overallSeverity: varchar("overall_severity", { length: 20 }).notNull(),
  reviewedAt: timestamp("reviewed_at").defaultNow(),
});

// ─── Generation Costs ──────────────────────────────────────────

export const generationCosts = mysqlTable("generation_costs", {
  id: int("id").primaryKey().autoincrement(),
  userId: int("user_id").notNull(),
  storyArcId: int("story_arc_id"),
  episodeId: int("episode_id"),
  service: varchar("service", { length: 50 }).notNull(),
  operation: varchar("operation", { length: 100 }).notNull(),
  estimatedCostCents: int("estimated_cost_cents").notNull(),
  tokensUsed: int("tokens_used"),
  createdAt: timestamp("created_at").defaultNow(),
});

// ─── Reading Streaks ───────────────────────────────────────────

export const readingStreaks = mysqlTable("reading_streaks", {
  id: int("id").primaryKey().autoincrement(),
  childId: int("child_id").notNull(),
  userId: int("user_id").notNull(),
  currentStreak: int("current_streak").default(0).notNull(),
  longestStreak: int("longest_streak").default(0).notNull(),
  lastReadDate: timestamp("last_read_date"),
  streakStartDate: timestamp("streak_start_date"),
  totalDaysRead: int("total_days_read").default(0).notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull().onUpdateNow(),
});

// ─── Achievements/Badges ───────────────────────────────────────

export const achievements = mysqlTable("achievements", {
  id: int("id").primaryKey().autoincrement(),
  childId: int("child_id").notNull(),
  userId: int("user_id").notNull(),
  achievementKey: varchar("achievement_key", { length: 100 }).notNull(),
  unlockedAt: timestamp("unlocked_at").defaultNow(),
  progress: int("progress").default(0).notNull(),
  metadata: json("metadata").$type<Record<string, unknown>>(),
});

// ─── Reading Activity Log ──────────────────────────────────────

export const readingActivity = mysqlTable("reading_activity", {
  id: int("id").primaryKey().autoincrement(),
  childId: int("child_id").notNull(),
  userId: int("user_id").notNull(),
  episodeId: int("episode_id"),
  activityType: varchar("activity_type", { length: 50 }).notNull(), // "story_completed", "page_read", "bedtime_session", "streak_maintained"
  pointsEarned: int("points_earned").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// ─── Parent Co-Creation: Custom Story Elements ─────────────────

export const customStoryElements = mysqlTable("custom_story_elements", {
  id: int("id").primaryKey().autoincrement(),
  userId: int("user_id").notNull(),
  childId: int("child_id").notNull(),
  elementType: varchar("element_type", { length: 50 }).notNull(), // "character", "location", "moral", "pet", "object"
  name: varchar("name", { length: 200 }).notNull(),
  description: text("description"),
  imageUrl: varchar("image_url", { length: 500 }),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
});

// ─── Parent Co-Creation: Voice Recordings ──────────────────────

export const parentVoiceRecordings = mysqlTable("parent_voice_recordings", {
  id: int("id").primaryKey().autoincrement(),
  userId: int("user_id").notNull(),
  childId: int("child_id").notNull(),
  voiceName: varchar("voice_name", { length: 100 }).notNull(),
  sampleAudioUrl: varchar("sample_audio_url", { length: 500 }),
  voiceModelId: varchar("voice_model_id", { length: 200 }), // ElevenLabs cloned voice ID
  status: varchar("status", { length: 50 }).default("pending").notNull(), // "pending", "processing", "ready", "failed"
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
});

// ─── Parent Co-Creation: Story Approval Queue ──────────────────

export const storyApprovalQueue = mysqlTable("story_approval_queue", {
  id: int("id").primaryKey().autoincrement(),
  userId: int("user_id").notNull(),
  childId: int("child_id").notNull(),
  episodeId: int("episode_id").notNull(),
  status: varchar("status", { length: 50 }).default("pending").notNull(), // "pending", "approved", "rejected", "edited"
  parentNotes: text("parent_notes"),
  editedContent: json("edited_content").$type<Record<string, unknown>>(),
  reviewedAt: timestamp("reviewed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
});

// ─── Media Assets ──────────────────────────────────────────────
// Tracks all generated media (images, audio, music) with variants

export const mediaAssets = mysqlTable("media_assets", {
  id: int("id").primaryKey().autoincrement(),
  episodeId: int("episode_id"),
  userId: int("user_id").notNull(),
  assetType: varchar("asset_type", { length: 50 }).notNull(), // "image", "audio", "music", "pdf"
  originalUrl: varchar("original_url", { length: 500 }).notNull(),
  thumbnailUrl: varchar("thumbnail_url", { length: 500 }),
  mobileUrl: varchar("mobile_url", { length: 500 }),
  tabletUrl: varchar("tablet_url", { length: 500 }),
  printUrl: varchar("print_url", { length: 500 }),
  fileSize: int("file_size"), // bytes
  width: int("width"),
  height: int("height"),
  duration: int("duration"), // seconds, for audio/music
  format: varchar("format", { length: 20 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─── Media Generation Queue ────────────────────────────────────
// Tracks pending and in-progress media generation jobs

export const mediaQueue = mysqlTable("media_queue", {
  id: int("id").primaryKey().autoincrement(),
  episodeId: int("episode_id").notNull(),
  userId: int("user_id").notNull(),
  jobType: varchar("job_type", { length: 50 }).notNull(), // "image", "audio", "music"
  status: varchar("status", { length: 50 }).default("queued").notNull(), // "queued", "processing", "completed", "failed"
  priority: int("priority").default(0).notNull(),
  input: json("input").$type<Record<string, unknown>>(),
  output: json("output").$type<Record<string, unknown>>(),
  errorMessage: text("error_message"),
  retryCount: int("retry_count").default(0).notNull(),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─── Type Exports ──────────────────────────────────────────────

export type User = typeof users.$inferSelect;
export type Child = typeof children.$inferSelect;
export type StoryArc = typeof storyArcs.$inferSelect;
export type Episode = typeof episodes.$inferSelect;
export type Page = typeof pages.$inferSelect;
export type StoryRecommendation = typeof storyRecommendations.$inferSelect;
export type BookProduct = typeof bookProducts.$inferSelect;
export type ShippingAddress = typeof shippingAddresses.$inferSelect;
export type PrintOrder = typeof printOrders.$inferSelect;
export type ContentModerationLog = typeof contentModerationLog.$inferSelect;
export type GenerationCost = typeof generationCosts.$inferSelect;
export type ReadingStreak = typeof readingStreaks.$inferSelect;
export type Achievement = typeof achievements.$inferSelect;
export type ReadingActivity = typeof readingActivity.$inferSelect;
export type CustomStoryElement = typeof customStoryElements.$inferSelect;
export type ParentVoiceRecording = typeof parentVoiceRecordings.$inferSelect;
export type StoryApprovalQueueItem = typeof storyApprovalQueue.$inferSelect;
export type MediaAsset = typeof mediaAssets.$inferSelect;
export type MediaQueueItem = typeof mediaQueue.$inferSelect;
