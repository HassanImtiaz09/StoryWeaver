import { mysqlTable, int, varchar, text, json, timestamp, mysqlEnum, boolean, decimal, index, uniqueIndex } from "drizzle-orm/mysql-core";

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
}, (table) => [
  index("children_user_id_idx").on(table.userId),
  uniqueIndex("children_user_name_unique").on(table.userId, table.name),
]);

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
}, (table) => [
  index("story_arcs_child_id_idx").on(table.childId),
  index("story_arcs_user_id_idx").on(table.userId),
]);

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
}, (table) => [
  index("episodes_story_arc_id_idx").on(table.storyArcId),
  index("episodes_arc_episode_idx").on(table.storyArcId, table.episodeNumber),
]);

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
}, (table) => [
  index("pages_episode_id_idx").on(table.episodeId),
  index("pages_episode_page_idx").on(table.episodeId, table.pageNumber),
]);

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
}, (table) => [
  index("recommendations_user_id_idx").on(table.userId),
  index("recommendations_child_id_idx").on(table.childId),
]);

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
}, (table) => [
  index("shipping_user_id_idx").on(table.userId),
  index("shipping_user_default_idx").on(table.userId, table.isDefault),
]);

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
}, (table) => [
  index("moderation_user_id_idx").on(table.userId),
  index("moderation_child_id_idx").on(table.childId),
]);

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
}, (table) => [
  index("reading_streaks_child_id_idx").on(table.childId),
  index("reading_streaks_user_id_idx").on(table.userId),
]);

// ─── Achievements/Badges ───────────────────────────────────────

export const achievements = mysqlTable("achievements", {
  id: int("id").primaryKey().autoincrement(),
  childId: int("child_id").notNull(),
  userId: int("user_id").notNull(),
  achievementKey: varchar("achievement_key", { length: 100 }).notNull(),
  unlockedAt: timestamp("unlocked_at").defaultNow(),
  progress: int("progress").default(0).notNull(),
  metadata: json("metadata").$type<Record<string, unknown>>(),
}, (table) => [
  index("achievements_child_id_idx").on(table.childId),
  index("achievements_user_id_idx").on(table.userId),
]);

// ─── Reading Activity Log ──────────────────────────────────────

export const readingActivity = mysqlTable("reading_activity", {
  id: int("id").primaryKey().autoincrement(),
  childId: int("child_id").notNull(),
  userId: int("user_id").notNull(),
  episodeId: int("episode_id"),
  activityType: varchar("activity_type", { length: 50 }).notNull(), // "story_completed", "page_read", "bedtime_session", "streak_maintained"
  pointsEarned: int("points_earned").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("reading_activity_child_id_idx").on(table.childId),
  index("reading_activity_user_id_idx").on(table.userId),
  index("reading_activity_episode_id_idx").on(table.episodeId),
]);

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
}, (table) => [
  index("custom_story_elements_user_id_idx").on(table.userId),
  index("custom_story_elements_child_id_idx").on(table.childId),
]);

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

// ─── Character Avatars ────────────────────────────────────────
// Stores AI-generated character avatars for children

export const characterAvatars = mysqlTable("character_avatars", {
  id: int("id").primaryKey().autoincrement(),
  childId: int("child_id").notNull().unique(),
  photoUrl: varchar("photo_url", { length: 1024 }),
  artStyle: varchar("art_style", { length: 50 }).notNull(), // watercolor, cartoon, anime, storybook-classic, pixel-art
  description: json("description").$type<{
    hairColor: string;
    hairStyle: string;
    skinTone: string;
    eyeColor: string;
    expression: string;
    distinguishingFeatures: string[];
    clothingStyle: string;
    ageGroup: string;
    personalityHints: string[];
  }>().notNull(),
  selectedVariantId: varchar("selected_variant_id", { length: 100 }),
  variants: json("variants").$type<{
    portrait: string;
    fullBody: string;
    actionPose: string;
  }>().notNull(),
  consistencyPrompt: text("consistency_prompt"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

// ─── Collaborative Sessions ────────────────────────────────────
// Family Mode: Multiple family members co-create stories together

export const collaborativeSessions = mysqlTable("collaborative_sessions", {
  id: int("id").primaryKey().autoincrement(),
  arcId: int("arc_id").notNull(),
  hostUserId: int("host_user_id").notNull(),
  sessionCode: varchar("session_code", { length: 10 }).notNull().unique(),
  status: mysqlEnum("status", ["waiting", "active", "paused", "completed"]).default("waiting"),
  turnOrder: json("turn_order").$type<number[]>().default([]),
  currentTurnIndex: int("current_turn_index").default(0),
  turnTimeLimit: int("turn_time_limit").default(120), // seconds, 0 = unlimited
  maxParticipants: int("max_participants").default(4),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
});

export const sessionParticipants = mysqlTable("session_participants", {
  id: int("id").primaryKey().autoincrement(),
  sessionId: int("session_id").notNull(),
  userId: int("user_id").notNull(),
  childId: int("child_id"),
  displayName: varchar("display_name", { length: 100 }).notNull(),
  role: mysqlEnum("role", ["host", "contributor"]).default("contributor"),
  color: varchar("color", { length: 20 }).notNull(), // Hex color for avatar
  turnsCompleted: int("turns_completed").default(0),
  joinedAt: timestamp("joined_at").defaultNow().notNull(),
});

export const storySegments = mysqlTable("story_segments", {
  id: int("id").primaryKey().autoincrement(),
  sessionId: int("session_id").notNull(),
  participantId: int("participant_id").notNull(),
  pageNumber: int("page_number").notNull(),
  rawInput: text("raw_input").notNull(),
  enhancedText: text("enhanced_text").notNull(),
  imagePrompt: text("image_prompt"),
  imageUrl: varchar("image_url", { length: 1024 }),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
});

// ─── Story Translations (Multilingual Support) ────────────────────

export const storyTranslations = mysqlTable("story_translations", {
  id: int("id").primaryKey().autoincrement(),
  episodeId: int("episode_id").notNull(),
  sourceLanguage: varchar("source_language", { length: 10 }).notNull(), // e.g., 'en'
  targetLanguage: varchar("target_language", { length: 10 }).notNull(), // e.g., 'es'
  translatedTitle: varchar("translated_title", { length: 512 }),
  translatedSummary: text("translated_summary"),
  translationStatus: varchar("translation_status", { length: 50 }).default("pending").notNull(), // "pending", "in_progress", "completed", "failed"
  translationModel: varchar("translation_model", { length: 100 }).default("claude").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
});

export const pageTranslations = mysqlTable("page_translations", {
  id: int("id").primaryKey().autoincrement(),
  pageId: int("page_id").notNull(),
  translationId: int("translation_id").notNull(), // references storyTranslations
  sourceLanguage: varchar("source_language", { length: 10 }).notNull(),
  targetLanguage: varchar("target_language", { length: 10 }).notNull(),
  translatedText: text("translated_text"),
  translatedImagePrompt: text("translated_image_prompt"),
  translationStatus: varchar("translation_status", { length: 50 }).default("pending").notNull(), // "pending", "completed", "failed"
  createdAt: timestamp("created_at").defaultNow(),
});

// ─── Vocabulary Bank (Language Learning) ──────────────────────────

export const vocabularyBank = mysqlTable("vocabulary_bank", {
  id: int("id").primaryKey().autoincrement(),
  childId: int("child_id").notNull(),
  userId: int("user_id").notNull(),
  word: varchar("word", { length: 255 }).notNull(),
  translation: varchar("translation", { length: 255 }).notNull(),
  sourceLanguage: varchar("source_language", { length: 10 }).notNull(), // e.g., 'en'
  learningLanguage: varchar("learning_language", { length: 10 }).notNull(), // e.g., 'es'
  context: text("context"), // sentence or phrase where word appeared
  pronunciation: varchar("pronunciation", { length: 500 }), // phonetic guide
  definition: text("definition"), // simple definition for children
  masteryLevel: int("mastery_level").default(0).notNull(), // 0-100 percent
  timesEncountered: int("times_encountered").default(1).notNull(),
  lastReviewedAt: timestamp("last_reviewed_at"),
  addedAt: timestamp("added_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
});

// ─── Social Sharing & Gallery ──────────────────────────────────

export const sharedStories = mysqlTable("shared_stories", {
  id: int("id").primaryKey().autoincrement(),
  arcId: int("arc_id").notNull(),
  userId: int("user_id").notNull(),
  shareCode: varchar("share_code", { length: 10 }).notNull().unique(), // unique shareable link identifier
  privacyLevel: mysqlEnum("privacy_level", ["private", "link_only", "public"]).default("private").notNull(),
  isPublished: boolean("is_published").default(false).notNull(),
  publishedAt: timestamp("published_at"),
  viewCount: int("view_count").default(0).notNull(),
  likeCount: int("like_count").default(0).notNull(),
  shareCount: int("share_count").default(0).notNull(),
  reportCount: int("report_count").default(0).notNull(),
  moderationStatus: mysqlEnum("moderation_status", ["pending", "approved", "rejected"]).default("pending").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
}, (table) => [
  index("shared_stories_user_id_idx").on(table.userId),
  index("shared_stories_share_code_idx").on(table.shareCode),
]);

export const storyLikes = mysqlTable("story_likes", {
  id: int("id").primaryKey().autoincrement(),
  sharedStoryId: int("shared_story_id").notNull(),
  userId: int("user_id").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("story_likes_shared_story_id_idx").on(table.sharedStoryId),
]);

export const storyReports = mysqlTable("story_reports", {
  id: int("id").primaryKey().autoincrement(),
  sharedStoryId: int("shared_story_id").notNull(),
  userId: int("user_id").notNull(),
  reason: varchar("reason", { length: 255 }).notNull(), // e.g., "inappropriate", "spam", "copyright"
  reportStatus: mysqlEnum("report_status", ["pending", "reviewed", "dismissed"]).default("pending").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("story_reports_shared_story_id_idx").on(table.sharedStoryId),
]);

// ─── Educator Mode: Classrooms ────────────────────────────────
// Teacher-facing classroom management system

export const classrooms = mysqlTable("classrooms", {
  id: int("id").primaryKey().autoincrement(),
  teacherId: int("teacher_id").notNull(), // User ID of teacher
  name: varchar("name", { length: 255 }).notNull(),
  gradeLevel: varchar("grade_level", { length: 50 }).notNull(), // e.g., "K", "1st", "2nd", "3rd-4th", "5th-6th"
  joinCode: varchar("join_code", { length: 10 }).notNull().unique(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export const classroomStudents = mysqlTable("classroom_students", {
  id: int("id").primaryKey().autoincrement(),
  classroomId: int("classroom_id").notNull(),
  childId: int("child_id").notNull(),
  joinedAt: timestamp("joined_at").defaultNow().notNull(),
});

export const storyAssignments = mysqlTable("story_assignments", {
  id: int("id").primaryKey().autoincrement(),
  classroomId: int("classroom_id").notNull(),
  arcId: int("arc_id").notNull(), // Story arc ID
  instructions: text("instructions"), // Custom assignment instructions
  dueDate: timestamp("due_date"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const studentAssignmentProgress = mysqlTable("student_assignment_progress", {
  id: int("id").primaryKey().autoincrement(),
  assignmentId: int("assignment_id").notNull(),
  studentId: int("student_id").notNull(), // Child ID
  status: mysqlEnum("status", ["not_started", "in_progress", "completed"]).default("not_started"),
  completedAt: timestamp("completed_at"),
  completedPages: int("completed_pages").default(0),
  totalPages: int("total_pages").default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const assessments = mysqlTable("assessments", {
  id: int("id").primaryKey().autoincrement(),
  assignmentId: int("assignment_id"),
  studentId: int("student_id").notNull(), // Child ID
  episodeId: int("episode_id").notNull(),
  gradeLevel: varchar("grade_level", { length: 50 }).notNull(),
  questions: json("questions").$type<{
    id: string;
    type: "multiple_choice" | "true_false" | "short_answer" | "vocabulary" | "sequencing";
    question: string;
    options?: string[]; // for multiple choice
    correctAnswer?: string;
    vocabulary?: string; // for vocabulary questions
    definition?: string;
  }[]>().notNull(),
  answers: json("answers").$type<Record<string, string>>().default({}),
  score: int("score"),
  gradedAt: timestamp("graded_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─── Grandparent Co-Creation: Family & Memories ───────────────

export const familyInvites = mysqlTable("family_invites", {
  id: int("id").primaryKey().autoincrement(),
  inviterUserId: int("inviter_user_id").notNull(),
  familyMemberName: varchar("family_member_name", { length: 255 }).notNull(),
  relationship: mysqlEnum("relationship", [
    "grandparent",
    "aunt_uncle",
    "cousin",
    "family_friend",
    "other",
  ]).notNull(),
  inviteCode: varchar("invite_code", { length: 20 }).notNull(),
  email: varchar("email", { length: 255 }),
  status: mysqlEnum("status", ["pending", "accepted", "expired"]).default("pending"),
  acceptedByUserId: int("accepted_by_user_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  expiresAt: timestamp("expires_at"),
});

export const familyConnections = mysqlTable("family_connections", {
  id: int("id").primaryKey().autoincrement(),
  userId: int("user_id").notNull(),
  familyMemberUserId: int("family_member_user_id").notNull(),
  relationship: mysqlEnum("relationship", [
    "grandparent",
    "aunt_uncle",
    "cousin",
    "family_friend",
    "parent",
    "other",
  ]).notNull(),
  familyMemberName: varchar("family_member_name", { length: 255 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const coCreationSessions = mysqlTable("co_creation_sessions", {
  id: int("id").primaryKey().autoincrement(),
  hostUserId: int("host_user_id").notNull(),
  familyMemberUserId: int("family_member_user_id").notNull(),
  childId: int("child_id").notNull(),
  arcId: int("arc_id"),
  status: mysqlEnum("status", ["active", "paused", "completed"]).default("active"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
});

export const memoryPrompts = mysqlTable("memory_prompts", {
  id: int("id").primaryKey().autoincrement(),
  sessionId: int("session_id").notNull(),
  userId: int("user_id").notNull(),
  memoryText: text("memory_text").notNull(),
  category: mysqlEnum("category", [
    "childhood",
    "travel",
    "family_tradition",
    "funny_moment",
    "life_lesson",
  ]).notNull(),
  generatedStoryId: int("generated_story_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─── Social-Emotional Learning (SEL) ──────────────────────────

export const selTemplates = mysqlTable("sel_templates", {
  id: int("id").primaryKey().autoincrement(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description").notNull(),
  competency: mysqlEnum("competency", [
    "self_awareness",
    "self_management",
    "social_awareness",
    "relationship_skills",
    "responsible_decision_making",
  ]).notNull(),
  ageRangeMin: int("age_range_min").default(3),
  ageRangeMax: int("age_range_max").default(12),
  difficulty: mysqlEnum("difficulty", ["gentle", "moderate", "challenging"]).default("gentle"),
  promptTemplate: text("prompt_template").notNull(),
  emotionalGoals: json("emotional_goals").$type<string[]>().notNull(),
  iconEmoji: varchar("icon_emoji", { length: 10 }).notNull(),
  isBuiltIn: boolean("is_built_in").default(true),
  createdByUserId: int("created_by_user_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const selProgress = mysqlTable("sel_progress", {
  id: int("id").primaryKey().autoincrement(),
  childId: int("child_id").notNull(),
  templateId: int("template_id").notNull(),
  arcId: int("arc_id"),
  completedAt: timestamp("completed_at").defaultNow().notNull(),
  competency: mysqlEnum("competency", [
    "self_awareness",
    "self_management",
    "social_awareness",
    "relationship_skills",
    "responsible_decision_making",
  ]).notNull(),
});

export const selResponses = mysqlTable("sel_responses", {
  id: int("id").primaryKey().autoincrement(),
  childId: int("child_id").notNull(),
  templateId: int("template_id").notNull(),
  arcId: int("arc_id"),
  emotionFelt: varchar("emotion_felt", { length: 50 }).notNull(),
  emotionIntensity: int("emotion_intensity").default(3),
  reflection: text("reflection"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─── Smart Home Integration ────────────────────────────────────

export const smartHomeConfigs = mysqlTable("smart_home_configs", {
  id: int("id").primaryKey().autoincrement(),
  userId: int("user_id").notNull(),
  platform: mysqlEnum("platform", ["philips_hue", "alexa", "google_home", "other"]).notNull(),
  deviceName: varchar("device_name", { length: 255 }).notNull(),
  deviceId: varchar("device_id", { length: 255 }).notNull(),
  accessToken: varchar("access_token", { length: 500 }),
  refreshToken: varchar("refresh_token", { length: 500 }),
  isEnabled: boolean("is_enabled").default(true),
  settings: json("settings").$type<Record<string, any>>().default({}),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const bedtimeRoutines = mysqlTable("bedtime_routines", {
  id: int("id").primaryKey().autoincrement(),
  userId: int("user_id").notNull(),
  childId: int("child_id"),
  name: varchar("name", { length: 255 }).notNull(),
  scheduledTime: varchar("scheduled_time", { length: 10 }),
  steps: json("steps").$type<{ type: string; duration: number; config: Record<string, any> }[]>().notNull(),
  isActive: boolean("is_active").default(true),
  daysOfWeek: json("days_of_week").$type<number[]>().default([0,1,2,3,4,5,6]),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─── Diversity & Representation ────────────────────────────────────

export const diversityProfiles = mysqlTable("diversity_profiles", {
  id: int("id").primaryKey().autoincrement(),
  userId: int("user_id").notNull(),
  ethnicities: json("ethnicities").$type<string[]>().default([]),
  familyStructures: json("family_structures").$type<string[]>().default([]),
  abilities: json("abilities").$type<string[]>().default([]),
  culturalBackgrounds: json("cultural_backgrounds").$type<string[]>().default([]),
  genderExpression: json("gender_expression").$type<string[]>().default([]),
  bodyTypes: json("body_types").$type<string[]>().default([]),
  languages: json("languages").$type<string[]>().default([]),
  religiousSpiritual: json("religious_spiritual").$type<string[]>().default([]),
  preferMirrorFamily: boolean("prefer_mirror_family").default(true),
  diversityLevel: mysqlEnum("diversity_level", ["mirror_family", "balanced", "maximum_diversity"]).default("balanced"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ─── Narrative Milestones ──────────────────────────────────────
// Tracks narrative phase progression for each episode within a story arc
// Ensures consistency: each episode maps to a specific narrative phase

export const narrativeMilestones = mysqlTable("narrative_milestones", {
  id: int("id").primaryKey().autoincrement(),
  arcId: int("arc_id").notNull(),
  episodeId: int("episode_id").notNull(),
  episodeNumber: int("episode_number").notNull(),
  narrativePhase: mysqlEnum("narrative_phase", [
    "introduction",
    "rising_action",
    "midpoint_escalation",
    "climax_approach",
    "resolution",
  ]).notNull(),
  phaseGoals: json("phase_goals").$type<string[]>().notNull(), // What this phase should accomplish
  phaseOutcome: json("phase_outcome").$type<{
    goalsAchieved: string[];
    charactersIntroduced?: string[];
    plotPointsResolved?: string[];
    cliffhanger?: string;
  }>(),
  isCompleted: boolean("is_completed").default(false),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("milestones_arc_id_idx").on(table.arcId),
  index("milestones_arc_episode_idx").on(table.arcId, table.episodeNumber),
]);

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
export type CharacterAvatar = typeof characterAvatars.$inferSelect;
export type CollaborativeSession = typeof collaborativeSessions.$inferSelect;
export type SessionParticipant = typeof sessionParticipants.$inferSelect;
export type SharedStory = typeof sharedStories.$inferSelect;
export type StoryLike = typeof storyLikes.$inferSelect;
export type StoryReport = typeof storyReports.$inferSelect;
export type StorySegment = typeof storySegments.$inferSelect;
export type Classroom = typeof classrooms.$inferSelect;
export type ClassroomStudent = typeof classroomStudents.$inferSelect;
export type StoryAssignment = typeof storyAssignments.$inferSelect;
export type StudentAssignmentProgress = typeof studentAssignmentProgress.$inferSelect;
export type Assessment = typeof assessments.$inferSelect;
export type FamilyInvite = typeof familyInvites.$inferSelect;
export type FamilyConnection = typeof familyConnections.$inferSelect;
export type CoCreationSession = typeof coCreationSessions.$inferSelect;
export type MemoryPrompt = typeof memoryPrompts.$inferSelect;
export type SelTemplate = typeof selTemplates.$inferSelect;
export type SelProgress = typeof selProgress.$inferSelect;
export type SelResponse = typeof selResponses.$inferSelect;
export type SmartHomeConfig = typeof smartHomeConfigs.$inferSelect;
export type BedtimeRoutine = typeof bedtimeRoutines.$inferSelect;
export type DiversityProfile = typeof diversityProfiles.$inferSelect;
export type NarrativeMilestone = typeof narrativeMilestones.$inferSelect;
