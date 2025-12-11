// src/lib/auth.ts
import { sql } from './db';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';

const JWT_SECRET = process.env.JWT_SECRET!;
export const SESSION_COOKIE = 'chefora_session';

if (!JWT_SECRET) {
  throw new Error('Missing JWT_SECRET env var');
}

export type SessionUser = {
  id: string;
  name: string;
  email: string;
};

export async function hashPassword(password: string) {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

type JwtPayload = { userId: string };

export function createSessionToken(userId: string) {
  const payload: JwtPayload = { userId };
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

/**
 * Read current user from the session cookie.
 * Used in server components and API routes.
 */
export async function getCurrentUser(): Promise<SessionUser | null> {
  // In Next 16 cookies() can be treated as async-safe, so we `await` it
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;

    const { rows } = await sql<SessionUser>`
      SELECT id, name, email
      FROM users
      WHERE id = ${decoded.userId}
      LIMIT 1
    `;

    return rows[0] ?? null;
  } catch {
    return null;
  }
}
