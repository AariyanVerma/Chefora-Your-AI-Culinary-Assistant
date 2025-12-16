import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { is2FAEnabled } from '@/lib/2fa';

/**
 * GET /api/auth/2fa/status
 * Check if 2FA is enabled for the current user
 */
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const enabled = await is2FAEnabled(user.id);

    return NextResponse.json({
      ok: true,
      enabled,
    });
  } catch (err: any) {
    console.error('2FA status error:', err);
    return NextResponse.json(
      { error: err?.message || 'Failed to check 2FA status' },
      { status: 500 }
    );
  }
}
