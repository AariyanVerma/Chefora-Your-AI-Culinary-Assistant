import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { sql } from '@/lib/db';
import { generateSecret, generateQRCode } from '@/lib/2fa';

/**
 * GET /api/auth/2fa/setup
 * Generate a new 2FA secret and QR code for the current user
 */
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Generate new secret
    const { secret, otpauthUrl } = generateSecret(user.email);

    // Generate QR code
    const qrCodeDataURL = await generateQRCode(otpauthUrl);

    // IMPORTANT: Don't save the secret yet - user must verify first
    // Return the secret and QR code so user can scan it
    return NextResponse.json({
      ok: true,
      secret, // For manual entry backup
      qrCode: qrCodeDataURL,
      manualEntryKey: secret, // Base32 encoded secret for manual entry
    });
  } catch (err: any) {
    console.error('2FA setup error:', err);
    return NextResponse.json(
      { error: err?.message || 'Failed to generate 2FA setup' },
      { status: 500 }
    );
  }
}
