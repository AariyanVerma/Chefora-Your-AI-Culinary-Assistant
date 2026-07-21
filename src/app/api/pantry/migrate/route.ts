import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await sql`CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`;

    await sql`
      CREATE TABLE IF NOT EXISTS pantry_items (
        id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        quantity NUMERIC NOT NULL DEFAULT 0,
        unit TEXT NOT NULL DEFAULT 'pcs',
        category TEXT NOT NULL DEFAULT 'Other',
        location TEXT NOT NULL DEFAULT 'Pantry',
        expiry_date DATE,
        purchase_date DATE,
        is_opened BOOLEAN DEFAULT false,
        notes TEXT,
        price NUMERIC,
        brand TEXT,
        is_running_low BOOLEAN DEFAULT false,
        snooze_until TIMESTAMP WITH TIME ZONE,
        image_url TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `;

    try {
      await sql`
        DO $$ 
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'pantry_items' 
            AND column_name = 'image_url'
          ) THEN
            ALTER TABLE pantry_items ADD COLUMN image_url TEXT;
          END IF;
        END $$;
      `;
    } catch (error: any) {
      
      console.log('Note: Could not add image_url column - it may already exist:', error.message);
    }

    try {
      await sql`
        DO $$ 
        BEGIN
          -- If barcode exists and price doesn't, rename barcode to price and change type
          IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'pantry_items' 
            AND column_name = 'barcode'
          ) AND NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'pantry_items' 
            AND column_name = 'price'
          ) THEN
            ALTER TABLE pantry_items RENAME COLUMN barcode TO price;
            ALTER TABLE pantry_items ALTER COLUMN price TYPE NUMERIC USING NULL;
          -- If price doesn't exist at all, add it
          ELSIF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'pantry_items' 
            AND column_name = 'price'
          ) THEN
            ALTER TABLE pantry_items ADD COLUMN price NUMERIC;
          END IF;
        END $$;
      `;
    } catch (error: any) {
      
      console.log('Note: Could not migrate barcode to price column:', error.message);
    }

    await sql`CREATE INDEX IF NOT EXISTS idx_pantry_items_user_id ON pantry_items(user_id);`;
    await sql`CREATE INDEX IF NOT EXISTS idx_pantry_items_name ON pantry_items(name);`;
    await sql`CREATE INDEX IF NOT EXISTS idx_pantry_items_expiry_date ON pantry_items(expiry_date);`;
    await sql`CREATE INDEX IF NOT EXISTS idx_pantry_items_category ON pantry_items(category);`;
    await sql`CREATE INDEX IF NOT EXISTS idx_pantry_items_location ON pantry_items(location);`;
    await sql`CREATE INDEX IF NOT EXISTS idx_pantry_items_user_category ON pantry_items(user_id, category);`;
    await sql`CREATE INDEX IF NOT EXISTS idx_pantry_items_user_location ON pantry_items(user_id, location);`;

    await sql`
      CREATE TABLE IF NOT EXISTS shopping_list_items (
        id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        quantity NUMERIC NOT NULL DEFAULT 1,
        unit TEXT NOT NULL DEFAULT 'pcs',
        category TEXT,
        notes TEXT,
        is_completed BOOLEAN DEFAULT false,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `;

    await sql`CREATE INDEX IF NOT EXISTS idx_shopping_list_items_user_id ON shopping_list_items(user_id);`;
    await sql`CREATE INDEX IF NOT EXISTS idx_shopping_list_items_user_completed ON shopping_list_items(user_id, is_completed);`;

    return NextResponse.json({ 
      success: true, 
      message: 'Pantry tables created successfully' 
    });
  } catch (error: any) {
    console.error('Migration error:', error);
    return NextResponse.json(
      { 
        error: 'Migration failed', 
        details: error.message 
      },
      { status: 500 }
    );
  }
}
