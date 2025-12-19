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
      recipeId,
      recipeTitle,
      recipeImageUrl,
      recipePrepTime,
      recipeDifficulty,
      recipeServings,
      recipeCuisine,
      recipeDietTags,
    } = body;

    if (!recipeId || typeof recipeId !== 'string') {
      return NextResponse.json({ error: 'Recipe ID is required' }, { status: 400 });
    }

    // Upsert last recipe viewed
    try {
      await sql`
        INSERT INTO dashboard_last_recipe (
          user_id,
          recipe_id,
          recipe_title,
          recipe_image_url,
          recipe_prep_time,
          recipe_difficulty,
          recipe_servings,
          recipe_cuisine,
          recipe_diet_tags,
          viewed_at,
          updated_at
        )
        VALUES (
          ${user.id},
          ${recipeId},
          ${recipeTitle || null},
          ${recipeImageUrl || null},
          ${recipePrepTime || null},
          ${recipeDifficulty || null},
          ${recipeServings || null},
          ${recipeCuisine || null},
          ${Array.isArray(recipeDietTags) && recipeDietTags.length > 0 ? (recipeDietTags as any) : null},
          NOW(),
          NOW()
        )
        ON CONFLICT (user_id)
        DO UPDATE SET
          recipe_id = EXCLUDED.recipe_id,
          recipe_title = EXCLUDED.recipe_title,
          recipe_image_url = EXCLUDED.recipe_image_url,
          recipe_prep_time = EXCLUDED.recipe_prep_time,
          recipe_difficulty = EXCLUDED.recipe_difficulty,
          recipe_servings = EXCLUDED.recipe_servings,
          recipe_cuisine = EXCLUDED.recipe_cuisine,
          recipe_diet_tags = EXCLUDED.recipe_diet_tags,
          viewed_at = NOW(),
          updated_at = NOW()
      `;
    } catch (dbError: any) {
      // If table doesn't exist yet, that's okay - just log and continue
      if (dbError?.code === '42P01') {
        console.log('Dashboard last_recipe table does not exist yet. Run migration to enable tracking.');
        return NextResponse.json({ ok: true, message: 'Table not created yet' });
      }
      throw dbError;
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Track recipe error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}




