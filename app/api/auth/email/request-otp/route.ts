import { randomInt, randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';

import { getSql, hasDatabase } from '@/db';
import {
  hashUserValue,
  isSameOriginUserRequest,
  isValidUserEmail,
  normalizeUserEmail,
  requestFingerprint,
} from '@/lib/user-auth';
import { sendUserOtp } from '@/lib/user-email';

export const runtime = 'nodejs';

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

  let body: { email?: unknown };
  try {
    body = (await request.json()) as { email?: unknown };
  } catch {
    return NextResponse.json(
      { error: 'Invalid request body.' },
      { status: 400 },
    );
  }
  const email = normalizeUserEmail(body.email);
  if (!isValidUserEmail(email)) {
    return NextResponse.json(
      { error: 'Enter a valid email address.' },
      { status: 400 },
    );
  }

  const fingerprint = requestFingerprint(request);
  const sql = getSql();
  const limits = (await sql`
    SELECT
      COUNT(*) FILTER (
        WHERE email = ${email} AND requested_at > NOW() - INTERVAL '15 minutes'
      )::integer AS email_count,
      COUNT(*) FILTER (
        WHERE request_fingerprint = ${fingerprint}
          AND requested_at > NOW() - INTERVAL '15 minutes'
      )::integer AS fingerprint_count,
      MAX(requested_at) FILTER (WHERE email = ${email}) AS last_requested_at
    FROM user_otp_challenges
  `) as Array<{
    email_count: number;
    fingerprint_count: number;
    last_requested_at: string | Date | null;
  }>;
  const limit = limits[0];
  const lastRequestedAt = limit?.last_requested_at
    ? new Date(limit.last_requested_at).getTime()
    : 0;
  if (
    Number(limit?.email_count ?? 0) >= 3 ||
    Number(limit?.fingerprint_count ?? 0) >= 10 ||
    Date.now() - lastRequestedAt < 60_000
  ) {
    return NextResponse.json(
      { error: 'Please wait before requesting another code.' },
      { status: 429, headers: { 'Retry-After': '60' } },
    );
  }

  const challengeId = randomUUID();
  const otp = String(randomInt(0, 1_000_000)).padStart(6, '0');
  await sql.transaction([
    sql`
      UPDATE user_otp_challenges
      SET consumed_at = NOW()
      WHERE email = ${email} AND consumed_at IS NULL
    `,
    sql`
      INSERT INTO user_otp_challenges (
        id, email, code_hash, expires_at, request_fingerprint
      ) VALUES (
        ${challengeId},
        ${email},
        ${hashUserValue(`${challengeId}|${otp}`)},
        NOW() + INTERVAL '10 minutes',
        ${fingerprint}
      )
    `,
  ]);

  try {
    await sendUserOtp(email, otp);
  } catch (error) {
    console.error('User OTP delivery failed.', error);
    await sql`
      UPDATE user_otp_challenges SET consumed_at = NOW() WHERE id = ${challengeId}
    `;
    return NextResponse.json(
      { error: 'The verification email could not be sent. Please try again.' },
      { status: 502 },
    );
  }

  return NextResponse.json({ challengeId, email, expiresIn: 600 });
}
