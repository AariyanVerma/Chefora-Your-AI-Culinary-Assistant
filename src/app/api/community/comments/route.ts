import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { getCurrentUser } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const postId = searchParams.get('postId');
    
    if (!postId) {
      return NextResponse.json({ error: 'postId required' }, { status: 400 });
    }

    // Get comments with actual count from database
    const result = await sql`
      SELECT
        c.*,
        prof.username as author_username,
        prof.display_name as author_display_name,
        prof.avatar_url as author_avatar_url,
        CASE WHEN EXISTS (SELECT 1 FROM community_likes l WHERE l.comment_id = c.id AND l.user_id = ${user.id}) THEN true ELSE false END as is_liked
      FROM community_comments c
      INNER JOIN community_profiles prof ON prof.user_id = c.author_id
      WHERE c.post_id = ${postId}
        AND NOT EXISTS (SELECT 1 FROM community_blocks b WHERE (b.blocker_id = ${user.id} AND b.blocked_id = c.author_id) OR (b.blocked_id = ${user.id} AND b.blocker_id = c.author_id))
      ORDER BY c.created_at ASC
    `;

    const comments = result.rows.map((row: any) => ({
      id: row.id,
      post_id: row.post_id,
      author_id: row.author_id,
      author_username: row.author_username,
      author_display_name: row.author_display_name,
      author_avatar_url: row.author_avatar_url,
      content: row.content,
      parent_comment_id: row.parent_comment_id,
      like_count: row.like_count || 0,
      created_at: row.created_at,
      updated_at: row.updated_at,
      is_liked: row.is_liked || false,
    }));

    return NextResponse.json({ comments });
  } catch (error: any) {
    console.error('Error fetching comments:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
