import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { sql } from '@/lib/db';

export async function GET(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId') || user.id;
    const username = searchParams.get('username');

    // If username is provided, fetch post count for that user
    if (username) {
      const countResult = await sql<{ post_count: number }>`
        SELECT COALESCE(COUNT(*)::integer, 0) as post_count
        FROM community_posts cp
        WHERE cp.author_id = (SELECT user_id FROM community_profiles WHERE LOWER(username) = LOWER(${username}))
        AND cp.deleted_at IS NULL
      `;

      const postCount = countResult.rows.length > 0 ? countResult.rows[0].post_count : 0;
      return NextResponse.json({ post_count: postCount }, { status: 200 });
    }

    // Otherwise, return username and avatar_url for userId
    const result = await sql<{ username: string; avatar_url: string | null }>`
      SELECT username, avatar_url
      FROM community_profiles
      WHERE user_id = ${userId}
      LIMIT 1
    `;

    if (result.rows.length === 0) {
      return NextResponse.json({ username: null, avatar_url: null }, { status: 200 });
    }

    return NextResponse.json({ 
      username: result.rows[0].username, 
      avatar_url: result.rows[0].avatar_url 
    }, { status: 200 });
  } catch (error) {
    console.error('Profile API error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}







