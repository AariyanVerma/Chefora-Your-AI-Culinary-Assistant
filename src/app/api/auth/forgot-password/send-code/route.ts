import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { sendPasswordResetEmail } from '@/lib/email';
import crypto from 'crypto';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    // Check if user exists
    const userResult = await sql<{ id: string; name: string }>`
      SELECT id, name
      FROM users
      WHERE LOWER(email) = LOWER(${email.trim()})
      LIMIT 1
    `;

    // Don't reveal if email exists for security, but still return success
    if (!userResult.rows[0]) {
      // Return success even if user doesn't exist (security best practice)
      return NextResponse.json({ 
        ok: true, 
        message: 'If an account with that email exists, a reset code has been sent.' 
      });
    }

    const user = userResult.rows[0];

    // Generate 6-digit code
    const code = crypto.randomInt(100000, 999999).toString();

    // Set expiration to 15 minutes from now
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 15);

    // Invalidate any existing unused codes for this user
    await sql`
      UPDATE password_reset_codes
      SET used = TRUE
      WHERE user_id = ${user.id} AND used = FALSE
    `;

    // Insert new reset code
    await sql`
      INSERT INTO password_reset_codes (user_id, email, code, expires_at)
      VALUES (${user.id}, ${email.trim()}, ${code}, ${expiresAt.toISOString()})
    `;

    // Send password reset email
    const emailSent = await sendPasswordResetEmail(email, user.name, code);

    // If email service is not configured, log to console for development
    if (!emailSent && process.env.NODE_ENV === 'development') {
      console.log(`\n⚠️  [Password Reset] Email service not configured!`);
      console.log(`📧 Email: ${email}`);
      console.log(`🔐 Code: ${code}`);
      console.log(`⏰ Expires: ${expiresAt.toISOString()}`);
      console.log(`\n💡 To enable email sending, configure one of:`);
      console.log(`   - RESEND_API_KEY (recommended)`);
      console.log(`   - SENDGRID_API_KEY`);
      console.log(`   - SMTP_HOST, SMTP_USER, SMTP_PASS\n`);
    }

    // Never return the code in the response for security
    return NextResponse.json({ 
      ok: true, 
      message: 'If an account with that email exists, a reset code has been sent to your email.'
    });

  } catch (err: any) {
    console.error('Send reset code error:', err);
    return NextResponse.json(
      { error: 'Failed to send reset code. Please try again.' },
      { status: 500 }
    );
  }
}





