-- Dashboard tracking tables for recent pages and recipe views
-- Run this SQL in your PostgreSQL database

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- USER PAGE VISITS TABLE
-- ============================================
-- Tracks user navigation history for recent pages feature
CREATE TABLE IF NOT EXISTS dashboard_page_visits (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  path TEXT NOT NULL,
  title TEXT,
  icon TEXT,
  visited_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dashboard_page_visits_user_id ON dashboard_page_visits(user_id);
CREATE INDEX IF NOT EXISTS idx_dashboard_page_visits_user_visited ON dashboard_page_visits(user_id, visited_at DESC);
CREATE INDEX IF NOT EXISTS idx_dashboard_page_visits_user_path ON dashboard_page_visits(user_id, path);

-- Function to keep only last 50 visits per user (cleanup old entries)
CREATE OR REPLACE FUNCTION cleanup_old_page_visits()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM dashboard_page_visits
  WHERE user_id = NEW.user_id
  AND id NOT IN (
    SELECT id FROM dashboard_page_visits
    WHERE user_id = NEW.user_id
    ORDER BY visited_at DESC
    LIMIT 50
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_cleanup_page_visits
AFTER INSERT ON dashboard_page_visits
FOR EACH ROW
EXECUTE FUNCTION cleanup_old_page_visits();

-- ============================================
-- LAST RECIPE VIEWED TABLE
-- ============================================
-- Stores the last recipe a user viewed
CREATE TABLE IF NOT EXISTS dashboard_last_recipe (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  recipe_id TEXT NOT NULL,
  recipe_title TEXT,
  recipe_image_url TEXT,
  recipe_prep_time INTEGER,
  recipe_difficulty TEXT,
  recipe_servings INTEGER,
  recipe_cuisine TEXT,
  recipe_diet_tags TEXT[],
  viewed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dashboard_last_recipe_user_id ON dashboard_last_recipe(user_id);
