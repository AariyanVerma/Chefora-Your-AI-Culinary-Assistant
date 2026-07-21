import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { sql } from '@/lib/db';
import { generateSecret, generateQRCode } from '@/lib/2fa';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { secret, otpauthUrl } = generateSecret(user.email);

    const qrCodeDataURL = await generateQRCode(otpauthUrl);

    return NextResponse.json({
      ok: true,
      secret, 
      qrCode: qrCodeDataURL,
      manualEntryKey: secret, 
    });
  } catch (err: any) {
    console.error('2FA setup error:', err);
    return NextResponse.json(
      { error: err?.message || 'Failed to generate 2FA setup' },
      { status: 500 }
    );
  }
}
