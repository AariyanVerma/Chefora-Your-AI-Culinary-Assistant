import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { sql } from '@/lib/db';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch user data
    const userResult = await sql<{
      id: string;
      name: string;
      email: string;
      country: string | null;
      time_zone: string | null;
      cook_frequency: string | null;
      created_at: Date;
    }>`
      SELECT id, name, email, country, time_zone, cook_frequency, created_at
      FROM users
      WHERE id = ${user.id}
      LIMIT 1
    `;

    if (!userResult.rows[0]) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Fetch user profile
    const profileResult = await sql<{
      dietary_profile: string | null;
      allergies: string[] | null;
      skill_level: string | null;
      kitchen_tools: string[] | null;
      favorite_cuisines: string[] | null;
      max_prep_time_minutes: number | null;
      persona: string | null;
    }>`
      SELECT dietary_profile, allergies, skill_level, kitchen_tools,
             favorite_cuisines, max_prep_time_minutes, persona
      FROM user_profiles
      WHERE user_id = ${user.id}
      LIMIT 1
    `;

    return NextResponse.json({
      user: userResult.rows[0],
      profile: profileResult.rows[0] || null,
    });
  } catch (err: any) {
    console.error('Get user data error:', err);
    return NextResponse.json(
      { error: err?.message || 'Server error' },
      { status: 500 }
    );
  }
}




