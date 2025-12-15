import { NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { getCurrentUser } from '@/lib/auth';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const result = await sql`
      SELECT 
        CASE 
          WHEN f.user1_id = ${user.id} THEN f.user2_id
          ELSE f.user1_id
        END as friend_id,
        p.username,
        p.display_name,
        p.avatar_url
      FROM community_friendships f
      INNER JOIN community_profiles p ON (
        CASE 
          WHEN f.user1_id = ${user.id} THEN p.user_id = f.user2_id
          ELSE p.user_id = f.user1_id
        END
      )
      WHERE f.user1_id = ${user.id} OR f.user2_id = ${user.id}
      ORDER BY p.display_name ASC
    `;

    const friends = result.rows.map(row => ({
      id: row.friend_id,
      username: row.username,
      display_name: row.display_name,
      avatar_url: row.avatar_url,
    }));

    return NextResponse.json({ friends });
  } catch (error: any) {
    console.error('Error fetching friends:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
