-- Migration: Add All Remaining Tables
-- Date: 2026-04-09
-- Description: Creates migration SQL for all tables added after the initial schema
-- (recommendations, print orders, moderation, gamification, parent tools, media pipeline,
--  educator mode, grandparent co-creation, SEL, smart home, diversity)

-- ─── Story Recommendations ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS story_recommendations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  child_id INT NOT NULL,
  title VARCHAR(512) NOT NULL,
  theme VARCHAR(255),
  educational_value VARCHAR(255),
  synopsis TEXT,
  image_url VARCHAR(1024),
  image_prompt TEXT,
  why_recommended TEXT,
  estimated_episodes INT DEFAULT 5,
  is_used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  KEY idx_user_id (user_id),
  KEY idx_child_id (child_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (child_id) REFERENCES children(id) ON DELETE CASCADE
);

-- ─── Book Products (Printful Catalog) ───────────────────────────────────
CREATE TABLE IF NOT EXISTS book_products (
  id INT AUTO_INCREMENT PRIMARY KEY,
  story_arc_id INT NOT NULL,
  user_id INT NOT NULL,
  child_id INT NOT NULL,
  title VARCHAR(300) NOT NULL,
  format VARCHAR(50) NOT NULL,
  size VARCHAR(20) NOT NULL,
  page_count INT NOT NULL,
  cover_image_url VARCHAR(500),
  interior_pdf_url VARCHAR(500),
  printful_product_id VARCHAR(200),
  status VARCHAR(50) DEFAULT 'draft' NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  KEY idx_story_arc_id (story_arc_id),
  KEY idx_user_id (user_id),
  FOREIGN KEY (story_arc_id) REFERENCES story_arcs(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (child_id) REFERENCES children(id) ON DELETE CASCADE
);

-- ─── Shipping Addresses ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS shipping_addresses (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  name VARCHAR(200) NOT NULL,
  address1 VARCHAR(300) NOT NULL,
  address2 VARCHAR(300),
  city VARCHAR(100) NOT NULL,
  state_code VARCHAR(10),
  country_code VARCHAR(5) NOT NULL,
  zip VARCHAR(20) NOT NULL,
  phone VARCHAR(30),
  is_default BOOLEAN DEFAULT FALSE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  KEY idx_user_id (user_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ─── Print Orders (Printful Integration) ────────────────────────────────
CREATE TABLE IF NOT EXISTS print_orders (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  story_arc_id INT NOT NULL,
  episode_id INT,
  printful_order_id VARCHAR(255),
  printful_sync_product_id VARCHAR(255),
  book_format VARCHAR(50) NOT NULL,
  page_count INT,
  cover_image_url VARCHAR(1024),
  interior_pdf_url VARCHAR(1024),
  order_status ENUM('draft','generating_pdf','pdf_ready','submitted','in_production','shipped','delivered','cancelled','failed') DEFAULT 'draft',
  shipping_name VARCHAR(255),
  shipping_address TEXT,
  shipping_city VARCHAR(255),
  shipping_state VARCHAR(100),
  shipping_zip VARCHAR(20),
  shipping_country VARCHAR(100),
  subtotal DECIMAL(10,2),
  shipping_cost DECIMAL(10,2),
  discount DECIMAL(10,2),
  total DECIMAL(10,2),
  currency VARCHAR(10) DEFAULT 'USD',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_user_id (user_id),
  KEY idx_story_arc_id (story_arc_id),
  KEY idx_order_status (order_status),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (story_arc_id) REFERENCES story_arcs(id) ON DELETE CASCADE,
  FOREIGN KEY (episode_id) REFERENCES episodes(id) ON DELETE SET NULL
);

-- ─── Content Moderation Log ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS content_moderation_log (
  id INT AUTO_INCREMENT PRIMARY KEY,
  episode_id INT,
  user_id INT NOT NULL,
  child_id INT NOT NULL,
  content_type VARCHAR(50) NOT NULL,
  approved BOOLEAN NOT NULL,
  flagged_items JSON,
  overall_severity VARCHAR(20) NOT NULL,
  reviewed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  KEY idx_user_id (user_id),
  KEY idx_episode_id (episode_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (child_id) REFERENCES children(id) ON DELETE CASCADE,
  FOREIGN KEY (episode_id) REFERENCES episodes(id) ON DELETE SET NULL
);

-- ─── Generation Costs ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS generation_costs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  story_arc_id INT,
  episode_id INT,
  service VARCHAR(50) NOT NULL,
  operation VARCHAR(100) NOT NULL,
  estimated_cost_cents INT NOT NULL,
  tokens_used INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  KEY idx_user_id (user_id),
  KEY idx_service (service),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (story_arc_id) REFERENCES story_arcs(id) ON DELETE SET NULL,
  FOREIGN KEY (episode_id) REFERENCES episodes(id) ON DELETE SET NULL
);

-- ─── Reading Streaks ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS reading_streaks (
  id INT AUTO_INCREMENT PRIMARY KEY,
  child_id INT NOT NULL,
  user_id INT NOT NULL,
  current_streak INT DEFAULT 0 NOT NULL,
  longest_streak INT DEFAULT 0 NOT NULL,
  last_read_date TIMESTAMP NULL,
  streak_start_date TIMESTAMP NULL,
  total_days_read INT DEFAULT 0 NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_child_streak (child_id),
  KEY idx_user_id (user_id),
  FOREIGN KEY (child_id) REFERENCES children(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ─── Achievements / Badges ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS achievements (
  id INT AUTO_INCREMENT PRIMARY KEY,
  child_id INT NOT NULL,
  user_id INT NOT NULL,
  achievement_key VARCHAR(100) NOT NULL,
  unlocked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  progress INT DEFAULT 0 NOT NULL,
  metadata JSON,
  KEY idx_child_id (child_id),
  KEY idx_achievement_key (achievement_key),
  UNIQUE KEY unique_child_achievement (child_id, achievement_key),
  FOREIGN KEY (child_id) REFERENCES children(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ─── Reading Activity Log ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS reading_activity (
  id INT AUTO_INCREMENT PRIMARY KEY,
  child_id INT NOT NULL,
  user_id INT NOT NULL,
  episode_id INT,
  activity_type VARCHAR(50) NOT NULL,
  points_earned INT DEFAULT 0 NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  KEY idx_child_id (child_id),
  KEY idx_activity_type (activity_type),
  KEY idx_created_at (created_at),
  FOREIGN KEY (child_id) REFERENCES children(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (episode_id) REFERENCES episodes(id) ON DELETE SET NULL
);

-- ─── Parent Co-Creation: Custom Story Elements ──────────────────────────
CREATE TABLE IF NOT EXISTS custom_story_elements (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  child_id INT NOT NULL,
  element_type VARCHAR(50) NOT NULL,
  name VARCHAR(200) NOT NULL,
  description TEXT,
  image_url VARCHAR(500),
  is_active BOOLEAN DEFAULT TRUE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_user_id (user_id),
  KEY idx_child_id (child_id),
  KEY idx_element_type (element_type),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (child_id) REFERENCES children(id) ON DELETE CASCADE
);

-- ─── Parent Co-Creation: Voice Recordings ───────────────────────────────
CREATE TABLE IF NOT EXISTS parent_voice_recordings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  child_id INT NOT NULL,
  voice_name VARCHAR(100) NOT NULL,
  sample_audio_url VARCHAR(500),
  voice_model_id VARCHAR(200),
  status VARCHAR(50) DEFAULT 'pending' NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_user_id (user_id),
  KEY idx_child_id (child_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (child_id) REFERENCES children(id) ON DELETE CASCADE
);

-- ─── Parent Co-Creation: Story Approval Queue ───────────────────────────
CREATE TABLE IF NOT EXISTS story_approval_queue (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  child_id INT NOT NULL,
  episode_id INT NOT NULL,
  status VARCHAR(50) DEFAULT 'pending' NOT NULL,
  parent_notes TEXT,
  edited_content JSON,
  reviewed_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_user_id (user_id),
  KEY idx_status (status),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (child_id) REFERENCES children(id) ON DELETE CASCADE,
  FOREIGN KEY (episode_id) REFERENCES episodes(id) ON DELETE CASCADE
);

-- ─── Media Assets ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS media_assets (
  id INT AUTO_INCREMENT PRIMARY KEY,
  episode_id INT,
  user_id INT NOT NULL,
  asset_type VARCHAR(50) NOT NULL,
  original_url VARCHAR(500) NOT NULL,
  thumbnail_url VARCHAR(500),
  mobile_url VARCHAR(500),
  tablet_url VARCHAR(500),
  print_url VARCHAR(500),
  file_size INT,
  width INT,
  height INT,
  duration INT,
  format VARCHAR(20),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  KEY idx_user_id (user_id),
  KEY idx_episode_id (episode_id),
  KEY idx_asset_type (asset_type),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (episode_id) REFERENCES episodes(id) ON DELETE SET NULL
);

-- ─── Media Generation Queue ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS media_queue (
  id INT AUTO_INCREMENT PRIMARY KEY,
  episode_id INT NOT NULL,
  user_id INT NOT NULL,
  job_type VARCHAR(50) NOT NULL,
  status VARCHAR(50) DEFAULT 'queued' NOT NULL,
  priority INT DEFAULT 0 NOT NULL,
  input JSON,
  output JSON,
  error_message TEXT,
  retry_count INT DEFAULT 0 NOT NULL,
  started_at TIMESTAMP NULL,
  completed_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  KEY idx_status (status),
  KEY idx_priority (priority),
  FOREIGN KEY (episode_id) REFERENCES episodes(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ─── Educator Mode: Classrooms ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS classrooms (
  id INT AUTO_INCREMENT PRIMARY KEY,
  teacher_id INT NOT NULL,
  name VARCHAR(255) NOT NULL,
  grade_level VARCHAR(50) NOT NULL,
  join_code VARCHAR(10) NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
  UNIQUE KEY unique_join_code (join_code),
  KEY idx_teacher_id (teacher_id),
  FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS classroom_students (
  id INT AUTO_INCREMENT PRIMARY KEY,
  classroom_id INT NOT NULL,
  child_id INT NOT NULL,
  joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  KEY idx_classroom_id (classroom_id),
  KEY idx_child_id (child_id),
  UNIQUE KEY unique_classroom_student (classroom_id, child_id),
  FOREIGN KEY (classroom_id) REFERENCES classrooms(id) ON DELETE CASCADE,
  FOREIGN KEY (child_id) REFERENCES children(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS story_assignments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  classroom_id INT NOT NULL,
  arc_id INT NOT NULL,
  instructions TEXT,
  due_date TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  KEY idx_classroom_id (classroom_id),
  KEY idx_arc_id (arc_id),
  FOREIGN KEY (classroom_id) REFERENCES classrooms(id) ON DELETE CASCADE,
  FOREIGN KEY (arc_id) REFERENCES story_arcs(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS student_assignment_progress (
  id INT AUTO_INCREMENT PRIMARY KEY,
  assignment_id INT NOT NULL,
  student_id INT NOT NULL,
  status ENUM('not_started','in_progress','completed') DEFAULT 'not_started',
  completed_at TIMESTAMP NULL,
  completed_pages INT DEFAULT 0,
  total_pages INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  KEY idx_assignment_id (assignment_id),
  KEY idx_student_id (student_id),
  UNIQUE KEY unique_assignment_student (assignment_id, student_id),
  FOREIGN KEY (assignment_id) REFERENCES story_assignments(id) ON DELETE CASCADE,
  FOREIGN KEY (student_id) REFERENCES children(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS assessments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  assignment_id INT,
  student_id INT NOT NULL,
  episode_id INT NOT NULL,
  grade_level VARCHAR(50) NOT NULL,
  questions JSON NOT NULL,
  answers JSON DEFAULT '{}',
  score INT,
  graded_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  KEY idx_student_id (student_id),
  KEY idx_episode_id (episode_id),
  FOREIGN KEY (assignment_id) REFERENCES story_assignments(id) ON DELETE SET NULL,
  FOREIGN KEY (student_id) REFERENCES children(id) ON DELETE CASCADE,
  FOREIGN KEY (episode_id) REFERENCES episodes(id) ON DELETE CASCADE
);

-- ─── Grandparent Co-Creation: Family Invites ────────────────────────────
CREATE TABLE IF NOT EXISTS family_invites (
  id INT AUTO_INCREMENT PRIMARY KEY,
  inviter_user_id INT NOT NULL,
  family_member_name VARCHAR(255) NOT NULL,
  relationship ENUM('grandparent','aunt_uncle','cousin','family_friend','other') NOT NULL,
  invite_code VARCHAR(20) NOT NULL,
  email VARCHAR(255),
  status ENUM('pending','accepted','expired') DEFAULT 'pending',
  accepted_by_user_id INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  expires_at TIMESTAMP NULL,
  KEY idx_inviter (inviter_user_id),
  KEY idx_invite_code (invite_code),
  FOREIGN KEY (inviter_user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (accepted_by_user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS family_connections (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  family_member_user_id INT NOT NULL,
  relationship ENUM('grandparent','aunt_uncle','cousin','family_friend','parent','other') NOT NULL,
  family_member_name VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  KEY idx_user_id (user_id),
  KEY idx_family_member (family_member_user_id),
  UNIQUE KEY unique_family_connection (user_id, family_member_user_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (family_member_user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS co_creation_sessions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  host_user_id INT NOT NULL,
  family_member_user_id INT NOT NULL,
  child_id INT NOT NULL,
  arc_id INT,
  status ENUM('active','paused','completed') DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  completed_at TIMESTAMP NULL,
  KEY idx_host (host_user_id),
  KEY idx_family_member (family_member_user_id),
  KEY idx_child_id (child_id),
  FOREIGN KEY (host_user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (family_member_user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (child_id) REFERENCES children(id) ON DELETE CASCADE,
  FOREIGN KEY (arc_id) REFERENCES story_arcs(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS memory_prompts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  session_id INT NOT NULL,
  user_id INT NOT NULL,
  memory_text TEXT NOT NULL,
  category ENUM('childhood','travel','family_tradition','funny_moment','life_lesson') NOT NULL,
  generated_story_id INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  KEY idx_session_id (session_id),
  KEY idx_user_id (user_id),
  FOREIGN KEY (session_id) REFERENCES co_creation_sessions(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (generated_story_id) REFERENCES story_arcs(id) ON DELETE SET NULL
);

-- ─── Social-Emotional Learning (SEL) Templates ─────────────────────────
CREATE TABLE IF NOT EXISTS sel_templates (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  competency ENUM('self_awareness','self_management','social_awareness','relationship_skills','responsible_decision_making') NOT NULL,
  age_range_min INT DEFAULT 3,
  age_range_max INT DEFAULT 12,
  difficulty ENUM('gentle','moderate','challenging') DEFAULT 'gentle',
  prompt_template TEXT NOT NULL,
  emotional_goals JSON NOT NULL,
  icon_emoji VARCHAR(10) NOT NULL,
  is_built_in BOOLEAN DEFAULT TRUE,
  created_by_user_id INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  KEY idx_competency (competency),
  KEY idx_difficulty (difficulty),
  FOREIGN KEY (created_by_user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS sel_progress (
  id INT AUTO_INCREMENT PRIMARY KEY,
  child_id INT NOT NULL,
  template_id INT NOT NULL,
  arc_id INT,
  completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  competency ENUM('self_awareness','self_management','social_awareness','relationship_skills','responsible_decision_making') NOT NULL,
  KEY idx_child_id (child_id),
  KEY idx_template_id (template_id),
  KEY idx_competency (competency),
  FOREIGN KEY (child_id) REFERENCES children(id) ON DELETE CASCADE,
  FOREIGN KEY (template_id) REFERENCES sel_templates(id) ON DELETE CASCADE,
  FOREIGN KEY (arc_id) REFERENCES story_arcs(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS sel_responses (
  id INT AUTO_INCREMENT PRIMARY KEY,
  child_id INT NOT NULL,
  template_id INT NOT NULL,
  arc_id INT,
  emotion_felt VARCHAR(50) NOT NULL,
  emotion_intensity INT DEFAULT 3,
  reflection TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  KEY idx_child_id (child_id),
  KEY idx_template_id (template_id),
  FOREIGN KEY (child_id) REFERENCES children(id) ON DELETE CASCADE,
  FOREIGN KEY (template_id) REFERENCES sel_templates(id) ON DELETE CASCADE,
  FOREIGN KEY (arc_id) REFERENCES story_arcs(id) ON DELETE SET NULL
);

-- ─── Smart Home Integration ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS smart_home_configs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  platform ENUM('philips_hue','alexa','google_home','other') NOT NULL,
  device_name VARCHAR(255) NOT NULL,
  device_id VARCHAR(255) NOT NULL,
  access_token VARCHAR(500),
  refresh_token VARCHAR(500),
  is_enabled BOOLEAN DEFAULT TRUE,
  settings JSON DEFAULT '{}',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  KEY idx_user_id (user_id),
  KEY idx_platform (platform),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS bedtime_routines (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  child_id INT,
  name VARCHAR(255) NOT NULL,
  scheduled_time VARCHAR(10),
  steps JSON NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  days_of_week JSON DEFAULT '[0,1,2,3,4,5,6]',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  KEY idx_user_id (user_id),
  KEY idx_child_id (child_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (child_id) REFERENCES children(id) ON DELETE SET NULL
);

-- ─── Narrative Milestones (Plot State Machine) ──────────────────────
CREATE TABLE IF NOT EXISTS narrative_milestones (
  id INT AUTO_INCREMENT PRIMARY KEY,
  arc_id INT NOT NULL,
  episode_id INT NOT NULL,
  episode_number INT NOT NULL,
  narrative_phase ENUM('introduction','rising_action','midpoint_escalation','climax_approach','resolution') NOT NULL,
  phase_goals JSON NOT NULL,
  phase_outcome JSON,
  is_completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  KEY idx_arc_id (arc_id),
  KEY idx_episode_id (episode_id),
  UNIQUE KEY unique_arc_episode (arc_id, episode_number),
  FOREIGN KEY (arc_id) REFERENCES story_arcs(id) ON DELETE CASCADE,
  FOREIGN KEY (episode_id) REFERENCES episodes(id) ON DELETE CASCADE
);

-- ─── Diversity & Representation Profiles ────────────────────────────────
CREATE TABLE IF NOT EXISTS diversity_profiles (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  ethnicities JSON DEFAULT '[]',
  family_structures JSON DEFAULT '[]',
  abilities JSON DEFAULT '[]',
  cultural_backgrounds JSON DEFAULT '[]',
  gender_expression JSON DEFAULT '[]',
  body_types JSON DEFAULT '[]',
  languages JSON DEFAULT '[]',
  religious_spiritual JSON DEFAULT '[]',
  prefer_mirror_family BOOLEAN DEFAULT TRUE,
  diversity_level ENUM('mirror_family','balanced','maximum_diversity') DEFAULT 'balanced',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  UNIQUE KEY unique_user_profile (user_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
