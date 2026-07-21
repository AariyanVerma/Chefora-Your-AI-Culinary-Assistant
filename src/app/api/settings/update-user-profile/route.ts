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
    const {
      dietaryProfile,
      allergies,
      skillLevel,
      kitchenTools,
      favoriteCuisines,
      maxPrepTimeMinutes,
      persona,
    } = body;

    const allergiesArr = Array.isArray(allergies) ? allergies : [];
    const toolsArr = Array.isArray(kitchenTools) ? kitchenTools : [];
    const cuisinesArr = Array.isArray(favoriteCuisines) ? favoriteCuisines : [];

    await sql`
      INSERT INTO user_profiles (
        user_id,
        dietary_profile,
        allergies,
        skill_level,
        kitchen_tools,
        favorite_cuisines,
        max_prep_time_minutes,
        persona
      ) VALUES (
        ${user.id},
        ${dietaryProfile || null},
        ${allergiesArr as any},
        ${skillLevel || null},
        ${toolsArr as any},
        ${cuisinesArr as any},
        ${maxPrepTimeMinutes || null},
        ${persona || null}
      )
      ON CONFLICT (user_id)
      DO UPDATE SET
        dietary_profile = EXCLUDED.dietary_profile,
        allergies = EXCLUDED.allergies,
        skill_level = EXCLUDED.skill_level,
        kitchen_tools = EXCLUDED.kitchen_tools,
        favorite_cuisines = EXCLUDED.favorite_cuisines,
        max_prep_time_minutes = EXCLUDED.max_prep_time_minutes,
        persona = EXCLUDED.persona,
        updated_at = NOW();
    `;

    return NextResponse.json({ ok: true, message: 'User profile updated successfully' });
  } catch (err: any) {
    console.error('Update user profile error:', err);
    return NextResponse.json(
      { error: err?.message || 'Server error' },
      { status: 500 }
    );
  }
}
