-- Migration: Add Improvement Tables
-- Date: 2026-04-08
-- Description: Creates new tables for character avatars, collaborative sessions, story translations,
-- vocabulary bank, and social sharing features

-- ─── Character Avatars ────────────────────────────────────────────────
-- Stores AI-generated character avatars for children
CREATE TABLE IF NOT EXISTS character_avatars (
  id INT AUTO_INCREMENT PRIMARY KEY,
  child_id INT NOT NULL,
  photo_url VARCHAR(1024),
  art_style VARCHAR(50) NOT NULL,
  description JSON NOT NULL,
  selected_variant_id VARCHAR(100),
  variants JSON NOT NULL,
  consistency_prompt TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
  UNIQUE KEY unique_child_avatar (child_id),
  FOREIGN KEY (child_id) REFERENCES children(id) ON DELETE CASCADE
);

-- ─── Collaborative Sessions ────────────────────────────────────────────
-- Family Mode: Multiple family members co-create stories together
CREATE TABLE IF NOT EXISTS collaborative_sessions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  arc_id INT NOT NULL,
  host_user_id INT NOT NULL,
  session_code VARCHAR(10) NOT NULL,
  status ENUM('waiting', 'active', 'paused', 'completed') DEFAULT 'waiting',
  turn_order JSON DEFAULT '[]',
  current_turn_index INT DEFAULT 0,
  turn_time_limit INT DEFAULT 120,
  max_participants INT DEFAULT 4,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  completed_at TIMESTAMP NULL,
  UNIQUE KEY unique_session_code (session_code),
  KEY idx_arc_id (arc_id),
  KEY idx_host_user_id (host_user_id),
  FOREIGN KEY (arc_id) REFERENCES story_arcs(id) ON DELETE CASCADE,
  FOREIGN KEY (host_user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ─── Session Participants ─────────────────────────────────────────────
-- Tracks participants in collaborative sessions
CREATE TABLE IF NOT EXISTS session_participants (
  id INT AUTO_INCREMENT PRIMARY KEY,
  session_id INT NOT NULL,
  user_id INT NOT NULL,
  child_id INT,
  display_name VARCHAR(100) NOT NULL,
  role ENUM('host', 'contributor') DEFAULT 'contributor',
  color VARCHAR(20) NOT NULL,
  turns_completed INT DEFAULT 0,
  joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  KEY idx_session_id (session_id),
  KEY idx_user_id (user_id),
  KEY idx_child_id (child_id),
  FOREIGN KEY (session_id) REFERENCES collaborative_sessions(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (child_id) REFERENCES children(id) ON DELETE SET NULL
);

-- ─── Story Segments ───────────────────────────────────────────────────
-- Stores individual story contributions from collaborative sessions
CREATE TABLE IF NOT EXISTS story_segments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  session_id INT NOT NULL,
  participant_id INT NOT NULL,
  page_number INT NOT NULL,
  raw_input TEXT NOT NULL,
  enhanced_text TEXT NOT NULL,
  image_prompt TEXT,
  image_url VARCHAR(1024),
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  KEY idx_session_id (session_id),
  KEY idx_participant_id (participant_id),
  FOREIGN KEY (session_id) REFERENCES collaborative_sessions(id) ON DELETE CASCADE,
  FOREIGN KEY (participant_id) REFERENCES session_participants(id) ON DELETE CASCADE
);

-- ─── Story Translations ───────────────────────────────────────────────
-- Multilingual Support: Story-level translations
CREATE TABLE IF NOT EXISTS story_translations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  episode_id INT NOT NULL,
  source_language VARCHAR(10) NOT NULL,
  target_language VARCHAR(10) NOT NULL,
  translated_title VARCHAR(512),
  translated_summary TEXT,
  translation_status VARCHAR(50) DEFAULT 'pending' NOT NULL,
  translation_model VARCHAR(100) DEFAULT 'claude' NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_episode_id (episode_id),
  KEY idx_languages (source_language, target_language),
  FOREIGN KEY (episode_id) REFERENCES episodes(id) ON DELETE CASCADE
);

-- ─── Page Translations ────────────────────────────────────────────────
-- Multilingual Support: Page-level translations
CREATE TABLE IF NOT EXISTS page_translations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  page_id INT NOT NULL,
  translation_id INT NOT NULL,
  source_language VARCHAR(10) NOT NULL,
  target_language VARCHAR(10) NOT NULL,
  translated_text TEXT,
  translated_image_prompt TEXT,
  translation_status VARCHAR(50) DEFAULT 'pending' NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  KEY idx_page_id (page_id),
  KEY idx_translation_id (translation_id),
  KEY idx_languages (source_language, target_language),
  FOREIGN KEY (page_id) REFERENCES pages(id) ON DELETE CASCADE,
  FOREIGN KEY (translation_id) REFERENCES story_translations(id) ON DELETE CASCADE
);

-- ─── Vocabulary Bank ──────────────────────────────────────────────────
-- Language Learning: Tracks vocabulary encountered and learned
CREATE TABLE IF NOT EXISTS vocabulary_bank (
  id INT AUTO_INCREMENT PRIMARY KEY,
  child_id INT NOT NULL,
  user_id INT NOT NULL,
  word VARCHAR(255) NOT NULL,
  translation VARCHAR(255) NOT NULL,
  source_language VARCHAR(10) NOT NULL,
  learning_language VARCHAR(10) NOT NULL,
  context TEXT,
  pronunciation VARCHAR(500),
  definition TEXT,
  mastery_level INT DEFAULT 0 NOT NULL,
  times_encountered INT DEFAULT 1 NOT NULL,
  last_reviewed_at TIMESTAMP NULL,
  added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_child_id (child_id),
  KEY idx_user_id (user_id),
  KEY idx_languages (source_language, learning_language),
  KEY idx_mastery (mastery_level),
  FOREIGN KEY (child_id) REFERENCES children(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ─── Shared Stories ───────────────────────────────────────────────────
-- Social Sharing & Gallery: Published stories available for sharing
CREATE TABLE IF NOT EXISTS shared_stories (
  id INT AUTO_INCREMENT PRIMARY KEY,
  arc_id INT NOT NULL,
  user_id INT NOT NULL,
  share_code VARCHAR(10) NOT NULL,
  privacy_level ENUM('private', 'link_only', 'public') DEFAULT 'private' NOT NULL,
  is_published BOOLEAN DEFAULT FALSE NOT NULL,
  published_at TIMESTAMP NULL,
  view_count INT DEFAULT 0 NOT NULL,
  like_count INT DEFAULT 0 NOT NULL,
  share_count INT DEFAULT 0 NOT NULL,
  report_count INT DEFAULT 0 NOT NULL,
  moderation_status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending' NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
  UNIQUE KEY unique_share_code (share_code),
  KEY idx_arc_id (arc_id),
  KEY idx_user_id (user_id),
  KEY idx_published (is_published),
  KEY idx_moderation (moderation_status),
  FOREIGN KEY (arc_id) REFERENCES story_arcs(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ─── Story Likes ──────────────────────────────────────────────────────
-- Social Sharing: User likes on shared stories
CREATE TABLE IF NOT EXISTS story_likes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  shared_story_id INT NOT NULL,
  user_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  UNIQUE KEY unique_story_like (shared_story_id, user_id),
  KEY idx_shared_story_id (shared_story_id),
  KEY idx_user_id (user_id),
  FOREIGN KEY (shared_story_id) REFERENCES shared_stories(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ─── Story Reports ────────────────────────────────────────────────────
-- Social Sharing: Content moderation reports
CREATE TABLE IF NOT EXISTS story_reports (
  id INT AUTO_INCREMENT PRIMARY KEY,
  shared_story_id INT NOT NULL,
  user_id INT NOT NULL,
  reason VARCHAR(255) NOT NULL,
  report_status ENUM('pending', 'reviewed', 'dismissed') DEFAULT 'pending' NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  KEY idx_shared_story_id (shared_story_id),
  KEY idx_user_id (user_id),
  KEY idx_report_status (report_status),
  FOREIGN KEY (shared_story_id) REFERENCES shared_stories(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
