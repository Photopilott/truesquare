import { randomInt, randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';

import { getSql, hasDatabase } from '@/db';
import {
  ADMIN_EMAIL,
  hashAdminValue,
  isAllowedAdminEmail,
  isSameOriginRequest,
  normalizeEmail,
  requestFingerprint,
} from '@/lib/admin-auth';
import { sendAdminOtp } from '@/lib/admin-email';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ error: 'Invalid request origin.' }, { status: 403 });
  }
  if (!hasDatabase()) {
    return NextResponse.json({ error: 'Authentication is unavailable.' }, { status: 503 });
  }

  let body: { email?: unknown };
  try {
    body = (await request.json()) as { email?: unknown };
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  }

  const email = normalizeEmail(body.email);
  if (!isAllowedAdminEmail(email)) {
    return NextResponse.json(
      { error: 'This email is not authorized for the admin console.' },
      { status: 403 },
    );
  }

  const fingerprint = requestFingerprint(request);
  const sql = getSql();
  const rateRows = await sql`
    SELECT
      COUNT(*) FILTER (
        WHERE requested_at > NOW() - INTERVAL '15 minutes'
          AND (email = ${ADMIN_EMAIL} OR request_fingerprint = ${fingerprint})
      )::integer AS recent_count,
      MAX(requested_at) FILTER (WHERE email = ${ADMIN_EMAIL}) AS last_requested_at
    FROM admin_otp_challenges
  ` as Array<{ recent_count: number; last_requested_at: string | Date | null }>;
  const rate = rateRows[0];
  if (Number(rate?.recent_count ?? 0) >= 5) {
    return NextResponse.json(
      { error: 'Too many code requests. Try again in 15 minutes.' },
      { status: 429 },
    );
  }
  if (
    rate?.last_requested_at &&
    Date.now() - new Date(rate.last_requested_at).getTime() < 60_000
  ) {
    return NextResponse.json(
      { error: 'A code was just sent. Wait one minute before requesting another.' },
      { status: 429 },
    );
  }

  const challengeId = randomUUID();
  const otp = String(randomInt(100_000, 1_000_000));
  const codeHash = hashAdminValue(`${challengeId}:${otp}`);
  await sql.transaction([
    sql`
      UPDATE admin_otp_challenges
      SET consumed_at = NOW()
      WHERE email = ${ADMIN_EMAIL} AND consumed_at IS NULL
    `,
    sql`
      INSERT INTO admin_otp_challenges (
        id, email, code_hash, expires_at, request_fingerprint
      ) VALUES (
        ${challengeId}, ${ADMIN_EMAIL}, ${codeHash}, NOW() + INTERVAL '10 minutes', ${fingerprint}
      )
    `,
  ]);

  try {
    await sendAdminOtp(otp);
  } catch (error) {
    await sql`
      UPDATE admin_otp_challenges SET consumed_at = NOW() WHERE id = ${challengeId}
    `;
    console.error('Admin OTP delivery failed.', error);
    return NextResponse.json(
      { error: 'The verification email could not be sent. Please try again.' },
      { status: 503 },
    );
  }

  return NextResponse.json({ challengeId, email: ADMIN_EMAIL, expiresIn: 600 });
}
