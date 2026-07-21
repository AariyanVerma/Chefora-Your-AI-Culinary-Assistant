
import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { verifyPassword, createSessionToken, SESSION_COOKIE } from '@/lib/auth';
import { verifyToken, is2FAEnabled } from '@/lib/2fa';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, password, totpCode } = body;

    if (!email || !password) {
      return NextResponse.json({ error: 'Missing email or password' }, { status: 400 });
    }

    const { rows } = await sql<{ id: string; password_hash: string; totp_secret: string | null }>`
      SELECT id, password_hash, totp_secret
      FROM users
      WHERE email = ${email}
      LIMIT 1
    `;

    const user = rows[0];
    if (!user) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const valid = await verifyPassword(password, user.password_hash);
    if (!valid) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const has2FA = user.totp_secret !== null && user.totp_secret !== undefined;

    if (has2FA) {
      
      if (!totpCode) {
        return NextResponse.json(
          { 
            error: '2FA code required',
            requires2FA: true 
          },
          { status: 401 }
        );
      }

      const isValidCode = verifyToken(totpCode, user.totp_secret!);
      if (!isValidCode) {
        return NextResponse.json(
          { 
            error: 'Invalid 2FA code. Please try again.',
            requires2FA: true 
          },
          { status: 401 }
        );
      }
    }

    const token = createSessionToken(user.id);

    const res = NextResponse.json({ ok: true });
    
    res.cookies.set(SESSION_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax', 
      path: '/',
      maxAge: 60 * 60 * 24 * 7, 
    });

    console.log('[Login API] Cookie set successfully:', {
      cookieName: SESSION_COOKIE,
      hasToken: !!token,
      tokenLength: token.length,
      environment: process.env.NODE_ENV,
      has2FA,
    });

    return res;
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
