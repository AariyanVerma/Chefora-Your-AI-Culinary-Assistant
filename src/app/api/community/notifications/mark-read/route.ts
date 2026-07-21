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
    const { notificationIds } = body;

    if (!Array.isArray(notificationIds) || notificationIds.length === 0) {
      return NextResponse.json({ error: 'Invalid notification IDs' }, { status: 400 });
    }

    await sql`
      UPDATE community_notifications
      SET read = true
      WHERE id = ANY(${notificationIds}::uuid[])
        AND user_id = ${user.id}
    `;

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Mark read API error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
