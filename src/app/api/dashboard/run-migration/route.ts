import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

// GET handler - provides instructions on how to use the endpoint
export async function GET(request: NextRequest) {
  return NextResponse.json({
    message: 'This endpoint requires a POST request.',
    instructions: [
      'Use curl: curl -X POST http://localhost:3000/api/dashboard/run-migration',
      'Or use a REST client like Postman to send a POST request',
      'Or use the browser console: fetch("/api/dashboard/run-migration", { method: "POST" })'
    ],
    note: 'You must be logged in to run this migration.'
  }, { status: 405 });
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only allow in development or for admin users
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json({ error: 'Not available in production' }, { status: 403 });
    }

    // Run the migration SQL
    try {
      await sql`
        CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
      `;

      // Create dashboard_page_visits table
      await sql`
        CREATE TABLE IF NOT EXISTS dashboard_page_visits (
          id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
          user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          path TEXT NOT NULL,
          title TEXT,
          icon TEXT,
          visited_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )
      `;

      await sql`
        CREATE INDEX IF NOT EXISTS idx_dashboard_page_visits_user_id ON dashboard_page_visits(user_id)
      `;

      await sql`
        CREATE INDEX IF NOT EXISTS idx_dashboard_page_visits_user_visited ON dashboard_page_visits(user_id, visited_at DESC)
      `;

      await sql`
        CREATE INDEX IF NOT EXISTS idx_dashboard_page_visits_user_path ON dashboard_page_visits(user_id, path)
      `;

      // Create cleanup function and trigger
      await sql`
        CREATE OR REPLACE FUNCTION cleanup_old_page_visits()
        RETURNS TRIGGER AS $$
        BEGIN
          DELETE FROM dashboard_page_visits
          WHERE user_id = NEW.user_id
          AND id NOT IN (
            SELECT id FROM dashboard_page_visits
            WHERE user_id = NEW.user_id
            ORDER BY visited_at DESC
            LIMIT 50
          );
          RETURN NEW;
        END;
        $$ LANGUAGE plpgsql
      `;

      await sql`
        DROP TRIGGER IF EXISTS trigger_cleanup_page_visits ON dashboard_page_visits
      `;

      await sql`
        CREATE TRIGGER trigger_cleanup_page_visits
        AFTER INSERT ON dashboard_page_visits
        FOR EACH ROW
        EXECUTE FUNCTION cleanup_old_page_visits()
      `;

      // Create dashboard_last_recipe table
      await sql`
        CREATE TABLE IF NOT EXISTS dashboard_last_recipe (
          id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
          user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
          recipe_id TEXT NOT NULL,
          recipe_title TEXT,
          recipe_image_url TEXT,
          recipe_prep_time INTEGER,
          recipe_difficulty TEXT,
          recipe_servings INTEGER,
          recipe_cuisine TEXT,
          recipe_diet_tags TEXT[],
          viewed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )
      `;

      await sql`
        CREATE INDEX IF NOT EXISTS idx_dashboard_last_recipe_user_id ON dashboard_last_recipe(user_id)
      `;

      return NextResponse.json({ 
        success: true,
        message: 'Dashboard migration completed successfully'
      });
    } catch (error: any) {
      // Check if it's an "already exists" error (which is fine)
      if (error?.message?.includes('already exists') || error?.message?.includes('duplicate')) {
        return NextResponse.json({ 
          success: true,
          message: 'Migration already applied (some objects already exist)'
        });
      }
      throw error;
    }
  } catch (error: any) {
    console.error('Error running dashboard migration:', error);
    return NextResponse.json({ 
      error: 'Internal server error', 
      details: error.message 
    }, { status: 500 });
  }
}
