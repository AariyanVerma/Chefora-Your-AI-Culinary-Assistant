import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Execute migration statements one by one
    await sql`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`;

    await sql`
      CREATE TABLE IF NOT EXISTS shopping_lists (
        id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name TEXT NOT NULL DEFAULT 'My Shopping List',
        store TEXT,
        planned_date DATE,
        archived BOOLEAN DEFAULT false,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS shopping_items (
        id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
        list_id UUID NOT NULL REFERENCES shopping_lists(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        quantity NUMERIC NOT NULL DEFAULT 1,
        unit TEXT NOT NULL DEFAULT 'pcs',
        category TEXT,
        aisle TEXT,
        store TEXT,
        priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
        price_est NUMERIC,
        notes TEXT,
        purchased BOOLEAN DEFAULT false,
        pantry_item_id UUID REFERENCES pantry_items(id) ON DELETE SET NULL,
        recipe_id TEXT,
        image_url TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `;

    // Add image_url column if it doesn't exist (for existing tables)
    await sql`
      DO $$ 
      BEGIN 
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'shopping_items' AND column_name = 'image_url'
        ) THEN
          ALTER TABLE shopping_items ADD COLUMN image_url TEXT;
        END IF;
      END $$;
    `;

    // Create indexes
    await sql`CREATE INDEX IF NOT EXISTS idx_shopping_lists_user_id ON shopping_lists(user_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_shopping_lists_user_archived ON shopping_lists(user_id, archived)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_shopping_items_list_id ON shopping_items(list_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_shopping_items_user_id ON shopping_items(user_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_shopping_items_purchased ON shopping_items(list_id, purchased)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_shopping_items_category ON shopping_items(category)`;

    return NextResponse.json({ 
      success: true, 
      message: 'Shopping list tables created successfully' 
    });
  } catch (error: any) {
    console.error('Migration error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Migration failed' 
      },
      { status: 500 }
    );
  }
}



