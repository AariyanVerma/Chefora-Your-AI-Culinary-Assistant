import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { sql } from '@/lib/db';

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { avatarDataUrl } = body;

    if (!avatarDataUrl || typeof avatarDataUrl !== 'string') {
      return NextResponse.json({ error: 'Avatar image is required' }, { status: 400 });
    }

    if (!avatarDataUrl.startsWith('data:image/')) {
      return NextResponse.json({ error: 'Invalid image format' }, { status: 400 });
    }

    const profileCheck = await sql<{ user_id: string }>`
      SELECT user_id FROM community_profiles WHERE user_id = ${user.id}
    `;

    if (profileCheck.rows.length === 0) {
      
      const { rows: userRows } = await sql<{ name: string; email: string }>`
        SELECT name, email FROM users WHERE id = ${user.id}
      `;
      const userData = userRows[0];
      
      await sql`
        INSERT INTO community_profiles (user_id, username, display_name, avatar_url)
        VALUES (
          ${user.id},
          ${user.email.split('@')[0] || `user_${user.id.slice(0, 8)}`},
          ${userData.name || 'User'},
          ${avatarDataUrl}
        )
      `;
    } else {
      
      await sql`
        UPDATE community_profiles
        SET avatar_url = ${avatarDataUrl}, updated_at = NOW()
        WHERE user_id = ${user.id}
      `;
    }

    return NextResponse.json({ success: true, avatar_url: avatarDataUrl }, { status: 200 });
  } catch (error) {
    console.error('Avatar upload error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
