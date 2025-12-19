import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function GET(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const query = searchParams.get('q') || '';

    if (!query || query.trim().length < 1) {
      return NextResponse.json({ users: [] });
    }

    const searchTerm = `%${query.trim()}%`;

    const users = await sql`
      SELECT 
        u.id,
        u.name,
        u.email,
        cp.avatar_url
      FROM users u
      LEFT JOIN community_profiles cp ON cp.user_id = u.id
      WHERE (u.name ILIKE ${searchTerm} OR u.email ILIKE ${searchTerm})
        AND u.id != ${user.id}
      LIMIT 20;
    `;

    return NextResponse.json({ users: users.rows });
  } catch (err: any) {
    console.error('Search users error:', err);
    return NextResponse.json(
      { error: err?.message || 'Failed to search users' },
      { status: 500 }
    );
  }
}

export const runtime = 'nodejs';






