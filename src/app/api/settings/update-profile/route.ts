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
    const { name, email, country, timeZone, cookFrequency } = body;

    // Validate required fields
    if (!name || !email) {
      return NextResponse.json({ error: 'Name and email are required' }, { status: 400 });
    }

    // Check if email is already taken by another user
    if (email !== user.email) {
      const existing = await sql`SELECT id FROM users WHERE email = ${email} AND id != ${user.id} LIMIT 1`;
      if (existing.rows[0]) {
        return NextResponse.json({ error: 'Email already in use' }, { status: 400 });
      }
    }

    // Update user info
    await sql`
      UPDATE users
      SET 
        name = ${name},
        email = ${email},
        country = ${country || null},
        time_zone = ${timeZone || null},
        cook_frequency = ${cookFrequency || null},
        updated_at = NOW()
      WHERE id = ${user.id}
    `;

    return NextResponse.json({ ok: true, message: 'Profile updated successfully' });
  } catch (err: any) {
    console.error('Update profile error:', err);
    return NextResponse.json(
      { error: err?.message || 'Server error' },
      { status: 500 }
    );
  }
}




