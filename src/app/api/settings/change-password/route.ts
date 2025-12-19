import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { sql } from '@/lib/db';
import { verifyPassword, hashPassword } from '@/lib/auth';

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { currentPassword, newPassword, confirmPassword } = body;

    // Validate required fields
    if (!currentPassword || !newPassword || !confirmPassword) {
      return NextResponse.json({ error: 'All password fields are required' }, { status: 400 });
    }

    // Check if new password matches confirmation
    if (newPassword !== confirmPassword) {
      return NextResponse.json({ error: 'New password and confirmation do not match' }, { status: 400 });
    }

    // Check password length
    if (newPassword.length < 6) {
      return NextResponse.json({ error: 'New password must be at least 6 characters' }, { status: 400 });
    }

    // Verify current password
    const userResult = await sql<{ password_hash: string }>`
      SELECT password_hash
      FROM users
      WHERE id = ${user.id}
      LIMIT 1
    `;

    if (!userResult.rows[0]) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const isValid = await verifyPassword(currentPassword, userResult.rows[0].password_hash);
    if (!isValid) {
      return NextResponse.json({ error: 'Current password is incorrect' }, { status: 401 });
    }

    // Hash new password
    const newPasswordHash = await hashPassword(newPassword);

    // Update password
    await sql`
      UPDATE users
      SET 
        password_hash = ${newPasswordHash},
        updated_at = NOW()
      WHERE id = ${user.id}
    `;

    return NextResponse.json({ ok: true, message: 'Password changed successfully' });
  } catch (err: any) {
    console.error('Change password error:', err);
    return NextResponse.json(
      { error: err?.message || 'Server error' },
      { status: 500 }
    );
  }
}




