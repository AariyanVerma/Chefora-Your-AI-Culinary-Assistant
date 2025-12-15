-- Community Module Database Schema
-- Run this SQL in your PostgreSQL database to create all community tables

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- PROFILES TABLE
-- ============================================
-- Extends user data with public profile info
CREATE TABLE IF NOT EXISTS community_profiles (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  username TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  bio TEXT,
  avatar_url TEXT,
  cover_image_url TEXT,
  location TEXT,
  website TEXT,
  verified BOOLEAN DEFAULT false,
  follower_count INTEGER DEFAULT 0,
  following_count INTEGER DEFAULT 0,
  post_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_community_profiles_user_id ON community_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_community_profiles_username ON community_profiles(username);
CREATE INDEX IF NOT EXISTS idx_community_profiles_username_lower ON community_profiles(LOWER(username));

-- ============================================
-- POSTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS community_posts (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  author_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  caption TEXT,
  visibility TEXT NOT NULL DEFAULT 'public' CHECK (visibility IN ('public', 'friends', 'private')),
  like_count INTEGER DEFAULT 0,
  comment_count INTEGER DEFAULT 0,
  repost_count INTEGER DEFAULT 0,
  save_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_community_posts_author_id ON community_posts(author_id);
CREATE INDEX IF NOT EXISTS idx_community_posts_visibility ON community_posts(visibility);
CREATE INDEX IF NOT EXISTS idx_community_posts_created_at ON community_posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_community_posts_author_created ON community_posts(author_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_community_posts_deleted_at ON community_posts(deleted_at) WHERE deleted_at IS NULL;

-- ============================================
-- POST MEDIA TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS community_post_media (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
  media_url TEXT NOT NULL,
  media_type TEXT NOT NULL DEFAULT 'image' CHECK (media_type IN ('image', 'video')),
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_community_post_media_post_id ON community_post_media(post_id);
CREATE INDEX IF NOT EXISTS idx_community_post_media_post_order ON community_post_media(post_id, order_index);

-- ============================================
-- RECIPES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS community_recipes (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  post_id UUID NOT NULL UNIQUE REFERENCES community_posts(id) ON DELETE CASCADE,
  ingredients JSONB NOT NULL DEFAULT '[]'::jsonb,
  instructions JSONB NOT NULL DEFAULT '[]'::jsonb,
  servings INTEGER,
  prep_time_minutes INTEGER,
  cook_time_minutes INTEGER,
  total_time_minutes INTEGER,
  difficulty TEXT CHECK (difficulty IN ('easy', 'medium', 'hard')),
  cuisine TEXT,
  diet_tags TEXT[],
  tags TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_community_recipes_post_id ON community_recipes(post_id);
CREATE INDEX IF NOT EXISTS idx_community_recipes_cuisine ON community_recipes(cuisine);
CREATE INDEX IF NOT EXISTS idx_community_recipes_difficulty ON community_recipes(difficulty);
CREATE INDEX IF NOT EXISTS idx_community_recipes_tags ON community_recipes USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_community_recipes_diet_tags ON community_recipes USING GIN(diet_tags);

-- ============================================
-- COMMENTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS community_comments (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  parent_comment_id UUID REFERENCES community_comments(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  like_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_community_comments_post_id ON community_comments(post_id);
CREATE INDEX IF NOT EXISTS idx_community_comments_author_id ON community_comments(author_id);
CREATE INDEX IF NOT EXISTS idx_community_comments_parent_id ON community_comments(parent_comment_id);
CREATE INDEX IF NOT EXISTS idx_community_comments_post_created ON community_comments(post_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_community_comments_deleted_at ON community_comments(deleted_at) WHERE deleted_at IS NULL;

-- ============================================
-- LIKES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS community_likes (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  post_id UUID REFERENCES community_posts(id) ON DELETE CASCADE,
  comment_id UUID REFERENCES community_comments(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT check_target CHECK (
    (post_id IS NOT NULL AND comment_id IS NULL) OR
    (post_id IS NULL AND comment_id IS NOT NULL)
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_community_likes_user_post ON community_likes(user_id, post_id) WHERE post_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_community_likes_user_comment ON community_likes(user_id, comment_id) WHERE comment_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_community_likes_post_id ON community_likes(post_id);
CREATE INDEX IF NOT EXISTS idx_community_likes_comment_id ON community_likes(comment_id);
CREATE INDEX IF NOT EXISTS idx_community_likes_user_id ON community_likes(user_id);

-- ============================================
-- BOOKMARKS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS community_bookmarks (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  post_id UUID NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
  collection_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, post_id)
);

CREATE INDEX IF NOT EXISTS idx_community_bookmarks_user_id ON community_bookmarks(user_id);
CREATE INDEX IF NOT EXISTS idx_community_bookmarks_post_id ON community_bookmarks(post_id);
CREATE INDEX IF NOT EXISTS idx_community_bookmarks_user_created ON community_bookmarks(user_id, created_at DESC);

-- ============================================
-- FOLLOWS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS community_follows (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  follower_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  following_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(follower_id, following_id),
  CONSTRAINT check_no_self_follow CHECK (follower_id != following_id)
);

CREATE INDEX IF NOT EXISTS idx_community_follows_follower_id ON community_follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_community_follows_following_id ON community_follows(following_id);
CREATE INDEX IF NOT EXISTS idx_community_follows_follower_following ON community_follows(follower_id, following_id);

-- ============================================
-- FRIEND REQUESTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS community_friend_requests (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  requester_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(requester_id, receiver_id),
  CONSTRAINT check_no_self_friend CHECK (requester_id != receiver_id)
);

CREATE INDEX IF NOT EXISTS idx_community_friend_requests_requester ON community_friend_requests(requester_id);
CREATE INDEX IF NOT EXISTS idx_community_friend_requests_receiver ON community_friend_requests(receiver_id);
CREATE INDEX IF NOT EXISTS idx_community_friend_requests_status ON community_friend_requests(status);
CREATE INDEX IF NOT EXISTS idx_community_friend_requests_receiver_status ON community_friend_requests(receiver_id, status) WHERE status = 'pending';

-- ============================================
-- FRIENDSHIPS TABLE (derived from accepted friend requests)
-- ============================================
CREATE TABLE IF NOT EXISTS community_friendships (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user1_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  user2_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user1_id, user2_id),
  CONSTRAINT check_user_order CHECK (user1_id < user2_id)
);

CREATE INDEX IF NOT EXISTS idx_community_friendships_user1 ON community_friendships(user1_id);
CREATE INDEX IF NOT EXISTS idx_community_friendships_user2 ON community_friendships(user2_id);
CREATE INDEX IF NOT EXISTS idx_community_friendships_both_users ON community_friendships(user1_id, user2_id);

-- ============================================
-- BLOCKS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS community_blocks (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  blocker_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  blocked_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(blocker_id, blocked_id),
  CONSTRAINT check_no_self_block CHECK (blocker_id != blocked_id)
);

CREATE INDEX IF NOT EXISTS idx_community_blocks_blocker_id ON community_blocks(blocker_id);
CREATE INDEX IF NOT EXISTS idx_community_blocks_blocked_id ON community_blocks(blocked_id);

-- ============================================
-- CONVERSATIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS community_conversations (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  type TEXT NOT NULL DEFAULT 'dm' CHECK (type IN ('dm', 'group')),
  name TEXT, -- For group chats
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_community_conversations_created_by ON community_conversations(created_by);
CREATE INDEX IF NOT EXISTS idx_community_conversations_type ON community_conversations(type);
CREATE INDEX IF NOT EXISTS idx_community_conversations_updated_at ON community_conversations(updated_at DESC);

-- ============================================
-- CONVERSATION MEMBERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS community_conversation_members (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES community_conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_read_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(conversation_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_community_conversation_members_conv_id ON community_conversation_members(conversation_id);
CREATE INDEX IF NOT EXISTS idx_community_conversation_members_user_id ON community_conversation_members(user_id);
CREATE INDEX IF NOT EXISTS idx_community_conversation_members_user_conv ON community_conversation_members(user_id, conversation_id);

-- ============================================
-- MESSAGES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS community_messages (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES community_conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  media_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_community_messages_conv_id ON community_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_community_messages_sender_id ON community_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_community_messages_conv_created ON community_messages(conversation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_community_messages_deleted_at ON community_messages(deleted_at) WHERE deleted_at IS NULL;

-- ============================================
-- NOTIFICATIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS community_notifications (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('follow', 'friend_request', 'friend_accepted', 'comment', 'like', 'mention', 'message', 'repost')),
  actor_id UUID REFERENCES users(id) ON DELETE CASCADE,
  post_id UUID REFERENCES community_posts(id) ON DELETE CASCADE,
  comment_id UUID REFERENCES community_comments(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES community_conversations(id) ON DELETE CASCADE,
  friend_request_id UUID REFERENCES community_friend_requests(id) ON DELETE CASCADE,
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_community_notifications_user_id ON community_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_community_notifications_user_read ON community_notifications(user_id, read);
CREATE INDEX IF NOT EXISTS idx_community_notifications_user_created ON community_notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_community_notifications_unread ON community_notifications(user_id, read) WHERE read = false;

-- ============================================
-- REPORTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS community_reports (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  reporter_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  target_type TEXT NOT NULL CHECK (target_type IN ('post', 'comment', 'user')),
  target_id UUID NOT NULL,
  reason TEXT NOT NULL,
  details TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'resolved', 'dismissed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_community_reports_reporter_id ON community_reports(reporter_id);
CREATE INDEX IF NOT EXISTS idx_community_reports_target ON community_reports(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_community_reports_status ON community_reports(status);
CREATE INDEX IF NOT EXISTS idx_community_reports_created_at ON community_reports(created_at DESC);

-- ============================================
-- REPOSTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS community_reposts (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  original_post_id UUID NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
  quote_text TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, original_post_id)
);

CREATE INDEX IF NOT EXISTS idx_community_reposts_user_id ON community_reposts(user_id);
CREATE INDEX IF NOT EXISTS idx_community_reposts_original_post_id ON community_reposts(original_post_id);
CREATE INDEX IF NOT EXISTS idx_community_reposts_user_created ON community_reposts(user_id, created_at DESC);

-- ============================================
-- TRIGGERS FOR COUNTER UPDATES
-- ============================================

-- Function to update post counters
CREATE OR REPLACE FUNCTION update_post_counters()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF TG_TABLE_NAME = 'community_likes' AND NEW.post_id IS NOT NULL THEN
      UPDATE community_posts SET like_count = like_count + 1 WHERE id = NEW.post_id;
    ELSIF TG_TABLE_NAME = 'community_comments' THEN
      UPDATE community_posts SET comment_count = comment_count + 1 WHERE id = NEW.post_id;
    ELSIF TG_TABLE_NAME = 'community_reposts' THEN
      UPDATE community_posts SET repost_count = repost_count + 1 WHERE id = NEW.original_post_id;
    ELSIF TG_TABLE_NAME = 'community_bookmarks' THEN
      UPDATE community_posts SET save_count = save_count + 1 WHERE id = NEW.post_id;
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    IF TG_TABLE_NAME = 'community_likes' AND OLD.post_id IS NOT NULL THEN
      UPDATE community_posts SET like_count = GREATEST(0, like_count - 1) WHERE id = OLD.post_id;
    ELSIF TG_TABLE_NAME = 'community_comments' THEN
      UPDATE community_posts SET comment_count = GREATEST(0, comment_count - 1) WHERE id = OLD.post_id;
    ELSIF TG_TABLE_NAME = 'community_reposts' THEN
      UPDATE community_posts SET repost_count = GREATEST(0, repost_count - 1) WHERE id = OLD.original_post_id;
    ELSIF TG_TABLE_NAME = 'community_bookmarks' THEN
      UPDATE community_posts SET save_count = GREATEST(0, save_count - 1) WHERE id = OLD.post_id;
    END IF;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Triggers for post counters
CREATE TRIGGER trigger_update_post_likes AFTER INSERT OR DELETE ON community_likes
  FOR EACH ROW WHEN (NEW.post_id IS NOT NULL OR OLD.post_id IS NOT NULL)
  EXECUTE FUNCTION update_post_counters();

CREATE TRIGGER trigger_update_post_comments AFTER INSERT OR DELETE ON community_comments
  FOR EACH ROW EXECUTE FUNCTION update_post_counters();

CREATE TRIGGER trigger_update_post_reposts AFTER INSERT OR DELETE ON community_reposts
  FOR EACH ROW EXECUTE FUNCTION update_post_counters();

CREATE TRIGGER trigger_update_post_bookmarks AFTER INSERT OR DELETE ON community_bookmarks
  FOR EACH ROW EXECUTE FUNCTION update_post_counters();

-- Function to update profile counters
CREATE OR REPLACE FUNCTION update_profile_counters()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF TG_TABLE_NAME = 'community_follows' THEN
      UPDATE community_profiles SET follower_count = follower_count + 1 WHERE user_id = NEW.following_id;
      UPDATE community_profiles SET following_count = following_count + 1 WHERE user_id = NEW.follower_id;
    ELSIF TG_TABLE_NAME = 'community_posts' THEN
      UPDATE community_profiles SET post_count = post_count + 1 WHERE user_id = NEW.author_id;
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    IF TG_TABLE_NAME = 'community_follows' THEN
      UPDATE community_profiles SET follower_count = GREATEST(0, follower_count - 1) WHERE user_id = OLD.following_id;
      UPDATE community_profiles SET following_count = GREATEST(0, following_count - 1) WHERE user_id = OLD.follower_id;
    ELSIF TG_TABLE_NAME = 'community_posts' THEN
      UPDATE community_profiles SET post_count = GREATEST(0, post_count - 1) WHERE user_id = OLD.author_id;
    END IF;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Triggers for profile counters
CREATE TRIGGER trigger_update_profile_follows AFTER INSERT OR DELETE ON community_follows
  FOR EACH ROW EXECUTE FUNCTION update_profile_counters();

CREATE TRIGGER trigger_update_profile_posts AFTER INSERT OR DELETE ON community_posts
  FOR EACH ROW EXECUTE FUNCTION update_profile_counters();

