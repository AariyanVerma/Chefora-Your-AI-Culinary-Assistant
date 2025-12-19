import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { sql } from '@/lib/db';
import { verifyToken } from '@/lib/2fa';

/**
 * POST /api/auth/2fa/enable
 * Enable 2FA for the current user after verifying the setup code
 */
export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { secret, code } = body;

    if (!secret || !code) {
      return NextResponse.json(
        { error: 'Secret and verification code are required' },
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

    // Save the secret to the database
    await sql`
      UPDATE users
      SET totp_secret = ${secret}, updated_at = NOW()
      WHERE id = ${user.id}
    `;

    return NextResponse.json({
      ok: true,
      message: '2FA has been enabled successfully!',
    });
  } catch (err: any) {
    console.error('2FA enable error:', err);
    return NextResponse.json(
      { error: err?.message || 'Failed to enable 2FA' },
      { status: 500 }
    );
  }
}




