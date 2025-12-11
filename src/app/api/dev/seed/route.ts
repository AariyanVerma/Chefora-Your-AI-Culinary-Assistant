import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export async function GET() {
  try {
    await sql`CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`;

    await sql`
      CREATE TABLE IF NOT EXISTS users (
        id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        country TEXT,
        time_zone TEXT,
        cook_frequency TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS user_profiles (
        user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        dietary_profile TEXT,
        allergies TEXT[],
        skill_level TEXT,
        kitchen_tools TEXT[],
        favorite_cuisines TEXT[],
        max_prep_time_minutes INT,
        persona TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `;

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Seed error:', err);
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
