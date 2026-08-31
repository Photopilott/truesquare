import { timingSafeEqual } from 'node:crypto';
import { NextResponse } from 'next/server';

import { getSql, hasDatabase } from '@/db';
import {
  createUserSession,
  hashUserValue,
  isSameOriginUserRequest,
  isValidUserEmail,
  normalizeUserEmail,
  USER_SESSION_COOKIE,
  userSessionCookieOptions,
} from '@/lib/user-auth';

export const runtime = 'nodejs';

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(request: Request) {
  if (!isSameOriginUserRequest(request)) {
    return NextResponse.json(
      { error: 'Invalid request origin.' },
      { status: 403 },
    );
  }
  if (!hasDatabase()) {
    return NextResponse.json(
      { error: 'Sign-in is temporarily unavailable.' },
      { status: 503 },
    );
  }

  let body: { challengeId?: unknown; email?: unknown; otp?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json(
      { error: 'Invalid request body.' },
      { status: 400 },
    );
  }
  const challengeId =
    typeof body.challengeId === 'string' ? body.challengeId : '';
  const email = normalizeUserEmail(body.email);
  const otp = typeof body.otp === 'string' ? body.otp.trim() : '';
  if (
    !UUID_PATTERN.test(challengeId) ||
    !isValidUserEmail(email) ||
    !/^\d{6}$/.test(otp)
  ) {
    return NextResponse.json(
      { error: 'Enter the six-digit code from your email.' },
      { status: 400 },
    );
  }

  const sql = getSql();
  const rows = (await sql`
    SELECT code_hash, expires_at, attempts_remaining
    FROM user_otp_challenges
    WHERE id = ${challengeId} AND email = ${email} AND consumed_at IS NULL
    LIMIT 1
  `) as Array<{
    code_hash: string;
    expires_at: string | Date;
    attempts_remaining: number;
  }>;
  const challenge = rows[0];
  if (!challenge || new Date(challenge.expires_at).getTime() <= Date.now()) {
    return NextResponse.json(
      { error: 'This code has expired. Request a new one.' },
      { status: 400 },
    );
  }
  const expected = Buffer.from(challenge.code_hash);
  const supplied = Buffer.from(hashUserValue(`${challengeId}|${otp}`));
  const valid =
    expected.length === supplied.length && timingSafeEqual(expected, supplied);
  if (!valid) {
    await sql`
      UPDATE user_otp_challenges
      SET
        attempts_remaining = GREATEST(attempts_remaining - 1, 0),
        consumed_at = CASE WHEN attempts_remaining <= 1 THEN NOW() ELSE consumed_at END
      WHERE id = ${challengeId}
    `;
    return NextResponse.json(
      {
        error:
          challenge.attempts_remaining <= 1
            ? 'Too many attempts. Request a new code.'
            : 'That code is incorrect.',
      },
      { status: 400 },
    );
  }

  await sql`UPDATE user_otp_challenges SET consumed_at = NOW() WHERE id = ${challengeId}`;
  const users = (await sql`
    INSERT INTO app_users (
      email, email_verified_at, last_auth_provider, last_login_at, updated_at
    ) VALUES (
      ${email}, NOW(), 'email_otp', NOW(), NOW()
    )
    ON CONFLICT (email) DO UPDATE SET
      email_verified_at = NOW(),
      last_auth_provider = 'email_otp',
      last_login_at = NOW(),
      updated_at = NOW()
    RETURNING id, email
  `) as Array<{ id: string; email: string }>;
  const user = users[0];
  const token = await createUserSession(user.id, 'email_otp');
  const response = NextResponse.json({
    authenticated: true,
    email: user.email,
  });
  response.cookies.set(USER_SESSION_COOKIE, token, userSessionCookieOptions());
  return response;
}
