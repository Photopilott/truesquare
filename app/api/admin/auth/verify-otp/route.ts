import { randomBytes, timingSafeEqual } from 'node:crypto';
import { NextResponse } from 'next/server';

import { getSql, hasDatabase } from '@/db';
import {
  ADMIN_EMAIL,
  ADMIN_SESSION_COOKIE,
  ADMIN_SESSION_SECONDS,
  adminSessionCookieOptions,
  hashAdminValue,
  isAllowedAdminEmail,
  isSameOriginRequest,
  normalizeEmail,
} from '@/lib/admin-auth';

export const runtime = 'nodejs';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ error: 'Invalid request origin.' }, { status: 403 });
  }
  if (!hasDatabase()) {
    return NextResponse.json({ error: 'Authentication is unavailable.' }, { status: 503 });
  }

  let body: { challengeId?: unknown; email?: unknown; otp?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  }
  const challengeId = typeof body.challengeId === 'string' ? body.challengeId : '';
  const email = normalizeEmail(body.email);
  const otp = typeof body.otp === 'string' ? body.otp.trim() : '';
  if (
    !UUID_PATTERN.test(challengeId) ||
    !isAllowedAdminEmail(email) ||
    !/^\d{6}$/.test(otp)
  ) {
    return NextResponse.json({ error: 'Enter the six-digit code.' }, { status: 400 });
  }

  const sql = getSql();
  const rows = await sql`
    SELECT code_hash, expires_at, attempts_remaining
    FROM admin_otp_challenges
    WHERE id = ${challengeId} AND email = ${ADMIN_EMAIL} AND consumed_at IS NULL
    LIMIT 1
  ` as Array<{
    code_hash: string;
    expires_at: string | Date;
    attempts_remaining: number;
  }>;
  const challenge = rows[0];
  if (
    !challenge ||
    new Date(challenge.expires_at).getTime() <= Date.now() ||
    challenge.attempts_remaining <= 0
  ) {
    return NextResponse.json(
      { error: 'This code has expired. Request a new one.' },
      { status: 400 },
    );
  }

  const expected = Buffer.from(challenge.code_hash, 'hex');
  const supplied = Buffer.from(hashAdminValue(`${challengeId}:${otp}`), 'hex');
  if (expected.length !== supplied.length || !timingSafeEqual(expected, supplied)) {
    await sql`
      UPDATE admin_otp_challenges
      SET
        attempts_remaining = attempts_remaining - 1,
        consumed_at = CASE WHEN attempts_remaining <= 1 THEN NOW() ELSE consumed_at END
      WHERE id = ${challengeId} AND consumed_at IS NULL
    `;
    return NextResponse.json(
      { error: 'That code is not correct. Please try again.' },
      { status: 400 },
    );
  }

  const sessionToken = randomBytes(32).toString('base64url');
  const tokenHash = hashAdminValue(sessionToken);
  const sessionRows = await sql`
    WITH consumed AS (
      UPDATE admin_otp_challenges
      SET consumed_at = NOW()
      WHERE
        id = ${challengeId}
        AND email = ${ADMIN_EMAIL}
        AND consumed_at IS NULL
        AND expires_at > NOW()
        AND attempts_remaining > 0
      RETURNING email
    ), revoked AS (
      UPDATE admin_sessions
      SET revoked_at = NOW()
      WHERE email = ${ADMIN_EMAIL} AND revoked_at IS NULL
        AND EXISTS (SELECT 1 FROM consumed)
    ), inserted AS (
      INSERT INTO admin_sessions (email, token_hash, expires_at)
      SELECT ${ADMIN_EMAIL}, ${tokenHash}, NOW() + INTERVAL '12 hours'
      FROM consumed
      RETURNING id
    )
    SELECT id FROM inserted
  ` as Array<{ id: string }>;
  if (!sessionRows[0]) {
    return NextResponse.json(
      { error: 'This code was already used. Request a new one.' },
      { status: 400 },
    );
  }

  const response = NextResponse.json({ authenticated: true, email: ADMIN_EMAIL });
  response.cookies.set(
    ADMIN_SESSION_COOKIE,
    sessionToken,
    adminSessionCookieOptions(),
  );
  response.headers.set('Cache-Control', 'no-store');
  response.headers.set('X-Session-Expires-In', String(ADMIN_SESSION_SECONDS));
  return response;
}
