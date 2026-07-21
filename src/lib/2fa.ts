
import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import { getCurrentUser } from './auth';
import { sql } from './db';

export function generateSecret(email: string): { secret: string; otpauthUrl: string } {
  const secret = speakeasy.generateSecret({
    name: `Chefora (${email})`,
    issuer: 'Chefora',
    length: 32,
  });

  return {
    secret: secret.base32 || '',
    otpauthUrl: secret.otpauth_url || '',
  };
}

export async function generateQRCode(otpauthUrl: string): Promise<string> {
  try {
    const qrCodeDataURL = await QRCode.toDataURL(otpauthUrl);
    return qrCodeDataURL;
  } catch (error) {
    console.error('Error generating QR code:', error);
    throw new Error('Failed to generate QR code');
  }
}

export function verifyToken(token: string, secret: string): boolean {
  try {
    const verified = speakeasy.totp.verify({
      secret: secret,
      encoding: 'base32',
      token: token,
      window: 2, 
    });
    return verified === true;
  } catch (error) {
    console.error('Error verifying token:', error);
    return false;
  }
}

export async function is2FAEnabled(userId: string): Promise<boolean> {
  try {
    const result = await sql<{ totp_secret: string | null }>`
      SELECT totp_secret
      FROM users
      WHERE id = ${userId}
      LIMIT 1
    `;

    return result.rows[0]?.totp_secret !== null && result.rows[0]?.totp_secret !== undefined;
  } catch (error) {
    console.error('Error checking 2FA status:', error);
    return false;
  }
}

export async function getUserTOTPSecret(userId: string): Promise<string | null> {
  try {
    const result = await sql<{ totp_secret: string | null }>`
      SELECT totp_secret
      FROM users
      WHERE id = ${userId}
      LIMIT 1
    `;

    return result.rows[0]?.totp_secret || null;
  } catch (error) {
    console.error('Error getting TOTP secret:', error);
    return null;
  }
}
