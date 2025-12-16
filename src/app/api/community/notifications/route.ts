import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { sql } from '@/lib/db';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const result = await sql<{
      id: string;
      type: string;
      actor_id: string;
      post_id: string | null;
      comment_id: string | null;
      read: boolean;
      created_at: string;
      actor_username: string;
      actor_display_name: string;
      actor_avatar_url: string | null;
      post_image_url: string | null;
      comment_content: string | null;
    }>`
      SELECT 
        n.id,
        n.type,
        n.actor_id,
        n.post_id,
        n.comment_id,
        n.read,
        n.created_at,
        prof.username as actor_username,
        prof.display_name as actor_display_name,
        prof.avatar_url as actor_avatar_url,
        (SELECT media_url FROM community_post_media WHERE post_id = n.post_id ORDER BY order_index ASC LIMIT 1) as post_image_url,
        (SELECT content FROM community_comments WHERE id = n.comment_id) as comment_content
      FROM community_notifications n
      LEFT JOIN community_profiles prof ON prof.user_id = n.actor_id
      WHERE n.user_id = ${user.id}
      ORDER BY n.created_at DESC
      LIMIT 50
    `;

    return NextResponse.json({ notifications: result.rows }, { status: 200 });
  } catch (error) {
    console.error('Notifications API error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}


