// Email utility functions for sending password reset codes
// This file provides email sending functionality

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

/**
 * Send email using configured email service
 * Currently supports:
 * - Resend (recommended for production)
 * - SendGrid
 * - Nodemailer (SMTP)
 * - Console fallback (development only)
 */
export async function sendEmail(options: EmailOptions): Promise<boolean> {
  const { to, subject, html, text } = options;

  // Try Resend API first (if configured)
  if (process.env.RESEND_API_KEY) {
    try {
      const { Resend } = await import('resend').catch(() => ({ Resend: null }));
      if (Resend) {
        const resend = new Resend(process.env.RESEND_API_KEY);
        // Use test domain for development if not specified (doesn't require domain verification)
        const fromEmail = process.env.RESEND_FROM_EMAIL || 
          (process.env.NODE_ENV === 'development' 
            ? 'Chefora <onboarding@resend.dev>' 
            : 'Chefora <noreply@chefora.com>');
        
        const result = await resend.emails.send({
          from: fromEmail,
          to: [to],
          subject,
          html,
          text: text || html.replace(/<[^>]*>/g, ''), // Fallback to plain text from HTML
        });
        if (result.data) {
          console.log('[Email] ✅ Sent via Resend. Email ID:', result.data.id);
          return true;
        }
        if (result.error) {
          console.error('[Email] ❌ Resend error:', result.error);
        }
      }
    } catch (err: any) {
      console.error('[Email] ❌ Resend error:', err?.message || err);
    }
  }

  // Try SendGrid API (if configured)
  if (process.env.SENDGRID_API_KEY) {
    try {
      const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.SENDGRID_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          personalizations: [{ to: [{ email: to }] }],
          from: { email: process.env.SENDGRID_FROM_EMAIL || 'noreply@chefora.com' },
          subject,
          content: [
            { type: 'text/html', value: html },
            ...(text ? [{ type: 'text/plain', value: text }] : []),
          ],
        }),
      });
      if (response.ok) {
        console.log('[Email] Sent via SendGrid');
        return true;
      }
    } catch (err) {
      console.error('[Email] SendGrid error:', err);
    }
  }

  // Try Nodemailer SMTP (if configured)
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    try {
      const nodemailer = await import('nodemailer').catch(() => null);
      if (nodemailer) {
        const transporter = nodemailer.createTransport({
          host: process.env.SMTP_HOST,
          port: parseInt(process.env.SMTP_PORT || '587'),
          secure: process.env.SMTP_SECURE === 'true',
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
          },
        });

        await transporter.sendMail({
          from: process.env.SMTP_FROM || process.env.SMTP_USER,
          to,
          subject,
          html,
          text,
        });
        console.log('[Email] Sent via SMTP');
        return true;
      }
    } catch (err) {
      console.error('[Email] SMTP error:', err);
    }
  }

  // Fallback: Log to console (development only)
  if (process.env.NODE_ENV === 'development') {
    console.log('\n========== EMAIL (Development Mode - Not Sent) ==========');
    console.log('To:', to);
    console.log('Subject:', subject);
    console.log('Body (HTML):', html);
    console.log('========================================================\n');
    return false; // Return false to indicate email wasn't actually sent
  }

  // Production fallback: log error
  console.error('[Email] No email service configured. Email not sent.');
  return false;
}

/**
 * Send password reset code email
 */
export async function sendPasswordResetEmail(
  email: string,
  name: string,
  code: string
): Promise<boolean> {
  const subject = 'Your Chefora Password Reset Code';
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Password Reset Code</title>
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0;">Chefora</h1>
        </div>
        <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
          <h2 style="color: #333; margin-top: 0;">Password Reset Request</h2>
          <p>Hi ${name},</p>
          <p>We received a request to reset your password. Use the code below to verify your identity:</p>
          <div style="background: #fff; border: 2px dashed #667eea; border-radius: 8px; padding: 20px; text-align: center; margin: 30px 0;">
            <div style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #667eea; font-family: monospace;">
              ${code}
            </div>
          </div>
          <p style="color: #666; font-size: 14px;">This code will expire in 15 minutes.</p>
          <p style="color: #666; font-size: 14px;">If you didn't request this password reset, you can safely ignore this email.</p>
          <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
          <p style="color: #999; font-size: 12px; text-align: center;">© ${new Date().getFullYear()} Chefora. All rights reserved.</p>
        </div>
      </body>
    </html>
  `;
  const text = `
Chefora - Password Reset Code

Hi ${name},

We received a request to reset your password. Use the code below to verify your identity:

${code}

This code will expire in 15 minutes.

If you didn't request this password reset, you can safely ignore this email.

© ${new Date().getFullYear()} Chefora. All rights reserved.
  `;

  return await sendEmail({ to: email, subject, html, text });
}
