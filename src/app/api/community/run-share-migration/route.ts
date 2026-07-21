import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function GET(request: NextRequest) {
  return NextResponse.json({
    message: 'This endpoint requires a POST request.',
    instructions: [
      'Use curl: curl -X POST http://localhost:3000/api/community/run-share-migration',
      'Or use a REST client like Postman to send a POST request',
      'Or use the browser console: fetch("/api/community/run-share-migration", { method: "POST" })'
    ],
    note: 'You must be logged in to run this migration.'
  }, { status: 405 });
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json({ error: 'Not available in production' }, { status: 403 });
    }

    try {
      
      await sql`
        ALTER TABLE community_posts 
        ADD COLUMN IF NOT EXISTS share_count INTEGER DEFAULT 0
      `;

      await sql`
        CREATE TABLE IF NOT EXISTS community_shares (
          id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
          user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          post_id UUID NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          UNIQUE(user_id, post_id)
        )
      `;

      await sql`
        CREATE INDEX IF NOT EXISTS idx_community_shares_user_id ON community_shares(user_id)
      `;
      await sql`
        CREATE INDEX IF NOT EXISTS idx_community_shares_post_id ON community_shares(post_id)
      `;
      await sql`
        CREATE INDEX IF NOT EXISTS idx_community_shares_user_created ON community_shares(user_id, created_at DESC)
      `;

      await sql`
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
          END IF;
          RETURN COALESCE(NEW, OLD);
        END;
        $$ LANGUAGE plpgsql
      `;

      await sql`
        DROP TRIGGER IF EXISTS trigger_update_post_shares ON community_shares
      `;
      await sql`
        CREATE TRIGGER trigger_update_post_shares AFTER INSERT OR DELETE ON community_shares
        FOR EACH ROW EXECUTE FUNCTION update_post_counters()
      `;

      return NextResponse.json({ 
        success: true,
        message: 'Share count migration completed successfully'
      });
    } catch (error: any) {
      
      if (error?.message?.includes('already exists') || error?.message?.includes('duplicate')) {
        return NextResponse.json({ 
          success: true,
          message: 'Migration already applied (some objects already exist)'
        });
      }
      throw error;
    }
  } catch (error: any) {
    console.error('Error running share migration:', error);
    return NextResponse.json({ 
      error: 'Internal server error', 
      details: error.message 
    }, { status: 500 });
  }
}
