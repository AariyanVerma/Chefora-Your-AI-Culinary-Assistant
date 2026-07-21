import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { sql } from '@/lib/db';
import { getPost } from '@/app/community/actions';
import { getPantryStats, getPantryItems } from '@/app/pantry/actions';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let profile: {
      dietary_profile: string | null;
      allergies: string[] | null;
      skill_level: string | null;
      kitchen_tools: string[] | null;
      favorite_cuisines: string[] | null;
      max_prep_time_minutes: number | null;
      persona: string | null;
    } | null = null;
    
    try {
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
      profile = profileRes.rows[0] || null;
    } catch (error: any) {
      
      console.log('Error fetching profile:', error?.message);
    }
    
    let totalRecipes = 0;
    try {
      const recipeCountRes = await sql<{ total: number }>`
        SELECT 
          COALESCE(
            (SELECT COUNT(*)::INTEGER 
             FROM community_posts 
             WHERE author_id = ${user.id} 
             AND deleted_at IS NULL), 0
          ) +
          COALESCE(
            (SELECT COUNT(*)::INTEGER 
             FROM community_bookmarks 
             WHERE user_id = ${user.id}), 0
          ) as total
      `;
      totalRecipes = recipeCountRes.rows[0]?.total || 0;
    } catch (error: any) {
      
      if (error?.code === '42P01') {
        console.log('Community tables might not exist yet. Recipe count will be 0.');
      } else {
        console.error('Error fetching recipe count:', error);
      }
    }

    let recentPages: Array<{
      path: string;
      title: string;
      icon: string;
      visited_at: Date;
      postImageUrl?: string | null;
      isPost?: boolean;
    }> = [];
    
    try {
      const recentPagesRes = await sql<{
        path: string;
        title: string;
        icon: string;
        visited_at: Date;
      }>`
        WITH ranked_visits AS (
          SELECT path, title, icon, visited_at,
                 ROW_NUMBER() OVER (PARTITION BY path ORDER BY visited_at DESC) as rn
          FROM dashboard_page_visits
          WHERE user_id = ${user.id}
          AND path != '/dashboard'
        )
        SELECT path, title, icon, visited_at
        FROM ranked_visits
        WHERE rn = 1
        ORDER BY visited_at DESC
        LIMIT 3
      `;
      
      recentPages = await Promise.all(recentPagesRes.rows.map(async (page) => {
        
        const normalizedPath = page.path.toLowerCase();
        const postMatch = normalizedPath.match(/^\/community\/p\/([^/]+)$/);
        if (postMatch) {
          
          const pathMatch = page.path.match(/^\/community\/p\/([^/]+)$/i);
          const postId = pathMatch ? pathMatch[1] : postMatch[1];
          try {
            const post = await getPost(postId);
            if (post) {
              return {
                ...page,
                title: post.title,
                postImageUrl: post.media_urls && post.media_urls.length > 0 ? post.media_urls[0] : null,
                isPost: true,
              };
            }
          } catch (error) {
            
            console.log('Failed to fetch post details for recent page:', error);
          }
        }
        return { ...page, isPost: false };
      }));
    } catch (error) {
      
      console.log('Recent pages table might not exist yet:', error);
    }

    let lastRecipe: {
      recipe_id: string;
      recipe_title: string | null;
      recipe_image_url: string | null;
      recipe_prep_time: number | null;
      recipe_difficulty: string | null;
      recipe_servings: number | null;
      recipe_cuisine: string | null;
      recipe_diet_tags: string[] | null;
    } | null = null;
    
    try {
      const lastRecipeRes = await sql<{
        recipe_id: string;
        recipe_title: string | null;
        recipe_image_url: string | null;
        recipe_prep_time: number | null;
        recipe_difficulty: string | null;
        recipe_servings: number | null;
        recipe_cuisine: string | null;
        recipe_diet_tags: string[] | null;
        viewed_at: Date;
      }>`
        SELECT recipe_id, recipe_title, recipe_image_url, recipe_prep_time,
               recipe_difficulty, recipe_servings, recipe_cuisine, recipe_diet_tags, viewed_at
        FROM dashboard_last_recipe
        WHERE user_id = ${user.id}
        LIMIT 1
      `;
      lastRecipe = lastRecipeRes.rows[0] || null;
    } catch (error) {
      
      console.log('Last recipe table might not exist yet:', error);
    }

    let pantryStats = {
      total_items: 0,
      expiring_1_3_days: 0,
      expiring_7_days: 0,
      expired: 0,
      health_score: 100,
    };
    let expiringIngredients: Array<{
      name: string;
      expiry_date: string;
      daysUntilExpiry: number;
    }> = [];

    try {
      pantryStats = await getPantryStats();
      
      const currentTime = new Date();
      const expiringItems = await getPantryItems({
        expiry_status: 'expiring_week', 
        sort_by: 'expiry_soonest',
        limit: 100, 
      });
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      expiringIngredients = expiringItems
        .filter(item => {
          
          if (!item.expiry_date) return false;
          const expiryDate = new Date(item.expiry_date);
          expiryDate.setHours(0, 0, 0, 0);
          return expiryDate >= today; 
        })
        .map(item => {
          const expiryDate = new Date(item.expiry_date!);
          expiryDate.setHours(0, 0, 0, 0);
          
          const daysUntilExpiry = Math.floor((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
          
          return {
            name: item.name,
            expiry_date: item.expiry_date!,
            daysUntilExpiry: daysUntilExpiry,
          };
        })
        .filter(item => item.daysUntilExpiry >= 0 && item.daysUntilExpiry <= 7) 
        .sort((a, b) => a.daysUntilExpiry - b.daysUntilExpiry);
      
    } catch (error: any) {
      console.log('Error fetching pantry data:', error?.message);
    }

    let weeklyMeals = 0;
    try {
      const startOfWeek = new Date();
      startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay() + 1); 
      startOfWeek.setHours(0, 0, 0, 0);
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(endOfWeek.getDate() + 6); 
      endOfWeek.setHours(23, 59, 59, 999);

      const weeklyMealsRes = await sql<{ count: number }>`
        SELECT COUNT(*)::INTEGER as count
        FROM community_posts
        WHERE author_id = ${user.id}
        AND created_at >= ${startOfWeek.toISOString()}
        AND created_at <= ${endOfWeek.toISOString()}
        AND deleted_at IS NULL
      `;
      weeklyMeals = weeklyMealsRes.rows[0]?.count || 0;
    } catch (error: any) {
      console.log('Error fetching weekly meals:', error?.message);
    }

    let streak = 0;
    try {
      const streakRes = await sql<{ activity_date: Date }>`
        SELECT DISTINCT DATE(created_at) as activity_date
        FROM community_posts
        WHERE author_id = ${user.id}
        AND deleted_at IS NULL
        ORDER BY activity_date DESC
        LIMIT 30
      `;
      
      if (streakRes.rows.length > 0) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        let consecutiveDays = 0;
        let checkDate = new Date(today);
        
        for (const row of streakRes.rows) {
          const activityDate = new Date(row.activity_date);
          activityDate.setHours(0, 0, 0, 0);
          
          if (activityDate.getTime() === checkDate.getTime()) {
            consecutiveDays++;
            checkDate.setDate(checkDate.getDate() - 1);
          } else if (activityDate.getTime() < checkDate.getTime()) {
            
            break;
          }
        }
        
        streak = consecutiveDays;
      }
    } catch (error: any) {
      console.log('Error calculating streak:', error?.message);
    }

    const recipesCooked = totalRecipes;

    const stats = {
      totalRecipes,
      recipesCooked,
      streak,
      ingredientsExpiring: pantryStats.expiring_1_3_days,
      weeklyMeals,
    };

    return NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
      profile,
      stats,
      recentPages,
      lastRecipe,
      pantryStats,
      expiringIngredients,
    });
  } catch (error: any) {
    console.error('Dashboard data error:', error);
    console.error('Error details:', {
      message: error?.message,
      code: error?.code,
      stack: error?.stack,
    });
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? error?.message : undefined
      },
      { status: 500 }
    );
  }
}
