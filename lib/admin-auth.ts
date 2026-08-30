import 'server-only';

import { createHmac } from 'node:crypto';
import { cookies } from 'next/headers';

import { getSql, hasDatabase } from '@/db';

export const ADMIN_EMAIL = 'kaizentushar@gmail.com';
export const ADMIN_SESSION_COOKIE = 'truesquare_admin_session';
export const ADMIN_SESSION_SECONDS = 60 * 60 * 12;

export type AdminSession = {
  id: string;
  email: string;
  expiresAt: string;
};

function authSecret() {
  const secret = process.env.ADMIN_AUTH_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error('ADMIN_AUTH_SECRET must be at least 32 characters.');
  }
  return secret;
}

export function normalizeEmail(value: unknown) {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

export function isAllowedAdminEmail(value: unknown) {
  return normalizeEmail(value) === ADMIN_EMAIL;
}

export function hashAdminValue(value: string) {
  return createHmac('sha256', authSecret()).update(value).digest('hex');
}

export function requestFingerprint(request: Request) {
  const forwarded = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  const address = forwarded || request.headers.get('x-real-ip') || 'unknown';
  const agent = request.headers.get('user-agent') || 'unknown';
  return hashAdminValue(`${address}|${agent}`);
}

export function isSameOriginRequest(request: Request) {
  const origin = request.headers.get('origin');
  if (!origin) return process.env.NODE_ENV !== 'production';
  return origin === new URL(request.url).origin;
}

function tokenFromCookieHeader(request: Request) {
  const cookieHeader = request.headers.get('cookie') ?? '';
  for (const part of cookieHeader.split(';')) {
    const [name, ...value] = part.trim().split('=');
    if (name === ADMIN_SESSION_COOKIE) return decodeURIComponent(value.join('='));
  }
  return null;
}

async function sessionForToken(token: string | null): Promise<AdminSession | null> {
  if (!token || !hasDatabase()) return null;
  const sql = getSql();
  const rows = await sql`
    SELECT id, email, expires_at
    FROM admin_sessions
    WHERE
      token_hash = ${hashAdminValue(token)}
      AND revoked_at IS NULL
      AND expires_at > NOW()
      AND email = ${ADMIN_EMAIL}
    LIMIT 1
  ` as Array<{ id: string; email: string; expires_at: string | Date }>;
  const row = rows[0];
  if (!row || !isAllowedAdminEmail(row.email)) return null;

  await sql`
    UPDATE admin_sessions
    SET last_seen_at = NOW()
    WHERE id = ${row.id} AND last_seen_at < NOW() - INTERVAL '5 minutes'
  `;

  return {
    id: row.id,
    email: normalizeEmail(row.email),
    expiresAt: new Date(row.expires_at).toISOString(),
  };
}

export async function getAdminSessionFromRequest(request: Request) {
  return sessionForToken(tokenFromCookieHeader(request));
}

export async function getCurrentAdminSession() {
  const cookieStore = await cookies();
  return sessionForToken(cookieStore.get(ADMIN_SESSION_COOKIE)?.value ?? null);
}

export function adminSessionCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict' as const,
    path: '/',
    maxAge: ADMIN_SESSION_SECONDS,
  };
}
