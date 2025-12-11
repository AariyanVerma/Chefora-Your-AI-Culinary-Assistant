import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { sql } from '@/lib/db';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch user profile
    const profileRes = await sql<{
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
      LIMIT 1;
    `;

    const profile = profileRes.rows[0] || null;
    
    // Debug logging
    console.log('Profile query result:', {
      userId: user.id,
      rowCount: profileRes.rows.length,
      profile: profile,
    });

    // TODO: Fetch actual stats from database
    // For now, return mock stats
    const stats = {
      recipesCooked: 12,
      streak: 5,
      ingredientsExpiring: 3,
      weeklyMeals: 7,
    };

    return NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
      profile,
      stats,
    });
  } catch (error) {
    console.error('Dashboard data error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

