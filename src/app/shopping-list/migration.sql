-- Shopping List Tables Migration
-- Run this SQL in your PostgreSQL database to create the shopping list tables

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Shopping Lists Table
CREATE TABLE IF NOT EXISTS shopping_lists (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'My Shopping List',
  store TEXT,
  planned_date DATE,
  archived BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Shopping Items Table
CREATE TABLE IF NOT EXISTS shopping_items (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  list_id UUID NOT NULL REFERENCES shopping_lists(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  quantity NUMERIC NOT NULL DEFAULT 1,
  unit TEXT NOT NULL DEFAULT 'pcs',
  category TEXT,
  aisle TEXT,
  store TEXT,
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  price_est NUMERIC,
  notes TEXT,
  purchased BOOLEAN DEFAULT false,
  pantry_item_id UUID REFERENCES pantry_items(id) ON DELETE SET NULL,
  recipe_id TEXT,
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_shopping_lists_user_id ON shopping_lists(user_id);
CREATE INDEX IF NOT EXISTS idx_shopping_lists_user_archived ON shopping_lists(user_id, archived);
CREATE INDEX IF NOT EXISTS idx_shopping_items_list_id ON shopping_items(list_id);
CREATE INDEX IF NOT EXISTS idx_shopping_items_user_id ON shopping_items(user_id);
CREATE INDEX IF NOT EXISTS idx_shopping_items_purchased ON shopping_items(list_id, purchased);
CREATE INDEX IF NOT EXISTS idx_shopping_items_category ON shopping_items(category);

-- Add image_url column if it doesn't exist (for existing tables)
DO $$ 
BEGIN 
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'shopping_items' AND column_name = 'image_url'
  ) THEN
    ALTER TABLE shopping_items ADD COLUMN image_url TEXT;
  END IF;
END $$;



