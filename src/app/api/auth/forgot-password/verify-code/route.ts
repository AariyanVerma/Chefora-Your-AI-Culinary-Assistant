import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import crypto from 'crypto';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, code } = body;

    if (!email || !code) {
      return NextResponse.json({ error: 'Email and code are required' }, { status: 400 });
    }

    const codeResult = await sql<{
      id: string;
      user_id: string;
      expires_at: Date;
      used: boolean;
    }>`
      SELECT id, user_id, expires_at, used
      FROM password_reset_codes
      WHERE LOWER(email) = LOWER(${email.trim()})
        AND code = ${code.trim()}
        AND used = FALSE
        AND expires_at > NOW()
      ORDER BY created_at DESC
      LIMIT 1
    `;

    if (!codeResult.rows[0]) {
      return NextResponse.json({ 
        error: 'Invalid or expired code. Please request a new code.' 
      }, { status: 400 });
    }

    const resetCode = codeResult.rows[0];

    await sql`
      UPDATE password_reset_codes
      SET used = TRUE
      WHERE id = ${resetCode.id}
    `;

    const resetToken = crypto.randomBytes(32).toString('hex');
    const tokenExpiresAt = new Date();
    tokenExpiresAt.setMinutes(tokenExpiresAt.getMinutes() + 10);

    await sql`
      INSERT INTO password_reset_codes (user_id, email, code, expires_at)
      VALUES (${resetCode.user_id}, ${email.trim()}, ${resetToken}, ${tokenExpiresAt.toISOString()})
      ON CONFLICT (user_id, code) DO NOTHING
    `;

    return NextResponse.json({ 
      ok: true, 
      resetToken,
      message: 'Code verified successfully. You can now reset your password.'
    });

  } catch (err: any) {
    console.error('Verify code error:', err);
    return NextResponse.json(
      { error: 'Failed to verify code. Please try again.' },
      { status: 500 }
    );
  }
}
