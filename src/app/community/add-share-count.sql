-- Add share_count column to community_posts table
ALTER TABLE community_posts 
ADD COLUMN IF NOT EXISTS share_count INTEGER DEFAULT 0;

-- Create community_shares table
CREATE TABLE IF NOT EXISTS community_shares (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  post_id UUID NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
  shared_to_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, post_id, shared_to_user_id)
);

CREATE INDEX IF NOT EXISTS idx_community_shares_user_id ON community_shares(user_id);
CREATE INDEX IF NOT EXISTS idx_community_shares_post_id ON community_shares(post_id);
CREATE INDEX IF NOT EXISTS idx_community_shares_user_created ON community_shares(user_id, created_at DESC);

-- Update the trigger function to handle shares
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
    ELSIF TG_TABLE_NAME = 'community_shares' THEN
      UPDATE community_posts SET share_count = share_count + 1 WHERE id = NEW.post_id;
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
    ELSIF TG_TABLE_NAME = 'community_shares' THEN
      UPDATE community_posts SET share_count = GREATEST(0, share_count - 1) WHERE id = OLD.post_id;
    END IF;
  END IF;image.png
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create trigger for shares
DROP TRIGGER IF EXISTS trigger_update_post_shares ON community_shares;
CREATE TRIGGER trigger_update_post_shares AFTER INSERT OR DELETE ON community_shares
  FOR EACH ROW EXECUTE FUNCTION update_post_counters();
