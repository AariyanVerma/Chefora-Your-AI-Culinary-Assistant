// src/app/api/auth/get-user-by-email/route.ts
import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    // Fetch user name by email (case-insensitive)
    const { rows } = await sql<{ name: string }>`
      SELECT name
      FROM users
      WHERE LOWER(email) = LOWER(${email.trim()})
      LIMIT 1
    `;

    if (!rows[0]) {
      return NextResponse.json({ name: null }, { status: 200 });
    }

    return NextResponse.json({ name: rows[0].name }, { status: 200 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

