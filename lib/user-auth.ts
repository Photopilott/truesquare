import 'server-only';

import {
  createHash,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from 'node:crypto';
import { cookies } from 'next/headers';

import { getSql, hasDatabase } from '@/db';

export const USER_SESSION_COOKIE = 'truesquare_user_session';
export const GOOGLE_OAUTH_COOKIE = 'truesquare_google_oauth';
export const USER_SESSION_SECONDS = 60 * 60 * 24 * 30;
export const DATA_COVENANT_VERSION = '2026-08-31';

export type UserAuthProvider = 'google' | 'email_otp';
export type ConsentContext = 'owner' | 'buyer';

export type UserSession = {
  sessionId: string;
  userId: string;
  email: string;
  displayName: string | null;
  pictureUrl: string | null;
  authProvider: UserAuthProvider;
  expiresAt: string;
};

function authSecret() {
  const secret = process.env.USER_AUTH_SECRET ?? process.env.ADMIN_AUTH_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error(
      'USER_AUTH_SECRET or ADMIN_AUTH_SECRET must be at least 32 characters.',
    );
  }
  return secret;
}

export function normalizeUserEmail(value: unknown) {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

export function isValidUserEmail(value: unknown) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeUserEmail(value));
}

export function hashUserValue(value: string) {
  return createHmac('sha256', authSecret()).update(value).digest('hex');
}

export function randomToken(bytes = 32) {
  return randomBytes(bytes).toString('base64url');
}

export function requestFingerprint(request: Request) {
  const forwarded = request.headers
    .get('x-forwarded-for')
    ?.split(',')[0]
    ?.trim();
  const address = forwarded || request.headers.get('x-real-ip') || 'unknown';
  const agent = request.headers.get('user-agent') || 'unknown';
  return hashUserValue(`${address}|${agent}`);
}

export function isSameOriginUserRequest(request: Request) {
  const origin = request.headers.get('origin');
  if (!origin) return process.env.NODE_ENV !== 'production';
  return origin === new URL(request.url).origin;
}

function tokenFromCookieHeader(request: Request) {
  const cookieHeader = request.headers.get('cookie') ?? '';
  for (const part of cookieHeader.split(';')) {
    const [name, ...value] = part.trim().split('=');
    if (name === USER_SESSION_COOKIE)
      return decodeURIComponent(value.join('='));
  }
  return null;
}

async function sessionForToken(
  token: string | null,
): Promise<UserSession | null> {
  if (!token || !hasDatabase()) return null;
  const sql = getSql();
  const rows = (await sql`
    SELECT
      us.id AS session_id,
      us.user_id,
      us.auth_provider,
      us.expires_at,
      au.email,
      au.display_name,
      au.picture_url
    FROM user_sessions us
    JOIN app_users au ON au.id = us.user_id
    WHERE
      us.token_hash = ${hashUserValue(token)}
      AND us.revoked_at IS NULL
      AND us.expires_at > NOW()
    LIMIT 1
  `) as Array<{
    session_id: string;
    user_id: string;
    auth_provider: UserAuthProvider;
    expires_at: string | Date;
    email: string;
    display_name: string | null;
    picture_url: string | null;
  }>;
  const row = rows[0];
  if (!row) return null;

  await sql`
    UPDATE user_sessions
    SET last_seen_at = NOW()
    WHERE id = ${row.session_id} AND last_seen_at < NOW() - INTERVAL '10 minutes'
  `;

  return {
    sessionId: row.session_id,
    userId: row.user_id,
    email: normalizeUserEmail(row.email),
    displayName: row.display_name,
    pictureUrl: row.picture_url,
    authProvider: row.auth_provider,
    expiresAt: new Date(row.expires_at).toISOString(),
  };
}

export async function getUserSessionFromRequest(request: Request) {
  return sessionForToken(tokenFromCookieHeader(request));
}

export async function getCurrentUserSession() {
  const cookieStore = await cookies();
  return sessionForToken(cookieStore.get(USER_SESSION_COOKIE)?.value ?? null);
}

export async function createUserSession(
  userId: string,
  provider: UserAuthProvider,
) {
  const token = randomToken();
  const sql = getSql();
  await sql.transaction([
    sql`
      DELETE FROM user_sessions
      WHERE user_id = ${userId}
        AND (expires_at <= NOW() OR revoked_at IS NOT NULL)
    `,
    sql`
      INSERT INTO user_sessions (user_id, token_hash, auth_provider, expires_at)
      VALUES (
        ${userId},
        ${hashUserValue(token)},
        ${provider},
        NOW() + INTERVAL '30 days'
      )
    `,
  ]);
  return token;
}

export function userSessionCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge: USER_SESSION_SECONDS,
  };
}

export function googleOAuthCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/api/auth/google',
    maxAge: 60 * 10,
  };
}

export function googleConfigured() {
  return Boolean(
    process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET,
  );
}

type GoogleOAuthState = {
  state: string;
  verifier: string;
  nonce: string;
  returnTo: string;
  expiresAt: number;
};

export function signGoogleOAuthState(value: GoogleOAuthState) {
  const payload = Buffer.from(JSON.stringify(value)).toString('base64url');
  return `${payload}.${hashUserValue(payload)}`;
}

export function verifyGoogleOAuthState(value: string | undefined) {
  if (!value) return null;
  const [payload, suppliedSignature] = value.split('.');
  if (!payload || !suppliedSignature) return null;
  const expected = Buffer.from(hashUserValue(payload));
  const supplied = Buffer.from(suppliedSignature);
  if (
    expected.length !== supplied.length ||
    !timingSafeEqual(expected, supplied)
  )
    return null;
  try {
    const parsed = JSON.parse(
      Buffer.from(payload, 'base64url').toString('utf8'),
    ) as GoogleOAuthState;
    if (parsed.expiresAt < Date.now()) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function pkceChallenge(verifier: string) {
  return createHash('sha256').update(verifier).digest('base64url');
}

export function safeReturnTo(value: string | null) {
  if (!value || !value.startsWith('/') || value.startsWith('//')) return '/';
  return value.slice(0, 500);
}

export async function consentForUser(userId: string, context: ConsentContext) {
  const sql = getSql();
  const rows = await sql`
    SELECT accepted_at
    FROM user_consents
    WHERE
      user_id = ${userId}
      AND context = ${context}
      AND covenant_version = ${DATA_COVENANT_VERSION}
      AND accepted = TRUE
    LIMIT 1
  `;
  return Boolean(rows[0]);
}
