import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';

// Simple endpoint to add image_url column - no auth required for development
// In production, you should add authentication
export async function GET() {
  try {
    // Add image_url column if it doesn't exist
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

    return NextResponse.json({ 
      success: true, 
      message: 'image_url column added successfully (or already exists)' 
    });
  } catch (error: any) {
    console.error('Error adding image_url column:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Failed to add column' 
      },
      { status: 500 }
    );
  }
}



