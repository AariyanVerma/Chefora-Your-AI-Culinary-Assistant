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
    const postIds = searchParams.get('postIds');
    
    if (!postIds) {
      return NextResponse.json({ error: 'postIds required' }, { status: 400 });
    }

    const ids = postIds.split(',').filter(Boolean);
    if (ids.length === 0) {
      return NextResponse.json({ counts: {} });
    }

    // Get actual counts from tables (not cached counts) to ensure accuracy
    const result = await sql`
      SELECT 
        p.id,
        (SELECT COUNT(*)::integer FROM community_likes WHERE post_id = p.id) as like_count,
        (SELECT COUNT(*)::integer FROM community_comments WHERE post_id = p.id) as comment_count,
        (SELECT COUNT(*)::integer FROM community_reposts WHERE original_post_id = p.id) as repost_count,
        (SELECT COUNT(*)::integer FROM community_bookmarks WHERE post_id = p.id) as save_count,
        (SELECT COUNT(*)::integer FROM community_shares WHERE post_id = p.id) as share_count,
        EXISTS (SELECT 1 FROM community_likes l WHERE l.post_id = p.id AND l.user_id = ${user.id}) as is_liked,
        EXISTS (SELECT 1 FROM community_bookmarks b WHERE b.post_id = p.id AND b.user_id = ${user.id}) as is_saved,
        EXISTS (SELECT 1 FROM community_reposts r WHERE r.original_post_id = p.id AND r.user_id = ${user.id}) as is_reposted
      FROM community_posts p
      WHERE p.id = ANY(${ids}::uuid[])
    `;

    const counts: Record<string, {
      like_count: number;
      comment_count: number;
      repost_count: number;
      save_count: number;
      share_count: number;
      is_liked: boolean;
      is_saved: boolean;
      is_reposted: boolean;
    }> = {};

    result.rows.forEach(row => {
      counts[row.id] = {
        like_count: row.like_count || 0,
        comment_count: row.comment_count || 0,
        repost_count: row.repost_count || 0,
        save_count: row.save_count || 0,
        share_count: row.share_count || 0,
        is_liked: row.is_liked || false,
        is_saved: row.is_saved || false,
        is_reposted: row.is_reposted || false,
      };
    });

    return NextResponse.json({ counts });
  } catch (error: any) {
    console.error('Error fetching post counts:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
