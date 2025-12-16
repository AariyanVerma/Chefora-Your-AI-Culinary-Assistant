import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { sql } from '@/lib/db';
import { verifyToken, getUserTOTPSecret } from '@/lib/2fa';

/**
 * POST /api/auth/2fa/disable
 * Disable 2FA for the current user (requires verification code)
 */
export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { code } = body;

    if (!code) {
      return NextResponse.json(
        { error: 'Verification code is required to disable 2FA' },
        { status: 400 }
      );
    }

    // Get user's current secret
    const secret = await getUserTOTPSecret(user.id);
    if (!secret) {
      return NextResponse.json(
        { error: '2FA is not enabled for this account' },
        { status: 400 }
      );
    }

    // Verify the code
    const isValid = verifyToken(code, secret);
    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid verification code. Please try again.' },
        { status: 400 }
      );
    }

    // Remove the secret from the database
    await sql`
      UPDATE users
      SET totp_secret = NULL, updated_at = NOW()
      WHERE id = ${user.id}
    `;

    return NextResponse.json({
      ok: true,
      message: '2FA has been disabled successfully.',
    });
  } catch (err: any) {
    console.error('2FA disable error:', err);
    return NextResponse.json(
      { error: err?.message || 'Failed to disable 2FA' },
      { status: 500 }
    );
  }
}
