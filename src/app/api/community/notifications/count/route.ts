import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { sql } from '@/lib/db';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ count: 0 }, { status: 200 });
    }

    const result = await sql<{ count: number }>`
      SELECT COUNT(*)::integer as count
      FROM community_notifications
      WHERE user_id = ${user.id} AND read = false
    `;

    return NextResponse.json({ count: result.rows[0]?.count || 0 }, { status: 200 });
  } catch (error) {
    console.error('Notifications count API error:', error);
    return NextResponse.json({ count: 0 }, { status: 200 });
  }
}







