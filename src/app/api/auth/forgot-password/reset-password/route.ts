import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { hashPassword } from '@/lib/auth';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { resetToken, newPassword, confirmPassword } = body;

    if (!resetToken || !newPassword || !confirmPassword) {
      return NextResponse.json({ error: 'All fields are required' }, { status: 400 });
    }

    if (newPassword !== confirmPassword) {
      return NextResponse.json({ error: 'Passwords do not match' }, { status: 400 });
    }

    if (newPassword.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
    }

    const tokenResult = await sql<{
      user_id: string;
      email: string;
    }>`
      SELECT user_id, email
      FROM password_reset_codes
      WHERE code = ${resetToken}
        AND used = FALSE
        AND expires_at > NOW()
      ORDER BY created_at DESC
      LIMIT 1
    `;

    if (!tokenResult.rows[0]) {
      return NextResponse.json({ 
        error: 'Invalid or expired reset token. Please request a new password reset.' 
      }, { status: 400 });
    }

    const { user_id, email } = tokenResult.rows[0];

    const passwordHash = await hashPassword(newPassword);

    await sql`
      UPDATE users
      SET password_hash = ${passwordHash}, updated_at = NOW()
      WHERE id = ${user_id}
    `;

    await sql`
      UPDATE password_reset_codes
      SET used = TRUE
      WHERE user_id = ${user_id}
    `;

    return NextResponse.json({ 
      ok: true, 
      message: 'Password reset successfully. You can now log in with your new password.'
    });

  } catch (err: any) {
    console.error('Reset password error:', err);
    return NextResponse.json(
      { error: 'Failed to reset password. Please try again.' },
      { status: 500 }
    );
  }
}
