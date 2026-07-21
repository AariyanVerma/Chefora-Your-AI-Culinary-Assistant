
import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { hashPassword, createSessionToken, SESSION_COOKIE } from '@/lib/auth';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      name,
      email,
      password,
      confirmPassword,
      country,
      timeZone,
      cookFrequency,
    } = body;

    if (!name || !email || !password || !confirmPassword) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (password !== confirmPassword) {
      return NextResponse.json({ error: 'Passwords do not match' }, { status: 400 });
    }

    const existing = await sql`SELECT id FROM users WHERE email = ${email} LIMIT 1`;
    if (existing.rows[0]) {
      return NextResponse.json({ error: 'Email already in use' }, { status: 400 });
    }

    const passwordHash = await hashPassword(password);

    const result = await sql<{ id: string }>`
      INSERT INTO users (name, email, password_hash, country, time_zone, cook_frequency)
      VALUES (${name}, ${email}, ${passwordHash}, ${country ?? null}, ${timeZone ?? null}, ${cookFrequency ?? null})
      RETURNING id;
    `;

    const userId = result.rows[0].id;

    await sql`
      INSERT INTO user_profiles (user_id)
      VALUES (${userId})
      ON CONFLICT (user_id) DO NOTHING;
    `;

    const token = createSessionToken(userId);

    const res = NextResponse.json({ ok: true, userId });
    res.cookies.set(SESSION_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7, 
    });

    return res;
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
