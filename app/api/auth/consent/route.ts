import { NextResponse } from 'next/server';

import { getSql } from '@/db';
import {
  DATA_COVENANT_VERSION,
  getUserSessionFromRequest,
  isSameOriginUserRequest,
  requestFingerprint,
} from '@/lib/user-auth';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  if (!isSameOriginUserRequest(request)) {
    return NextResponse.json(
      { error: 'Invalid request origin.' },
      { status: 403 },
    );
  }
  const session = await getUserSessionFromRequest(request);
  if (!session)
    return NextResponse.json(
      { error: 'Sign in to continue.' },
      { status: 401 },
    );

  let body: { context?: unknown; accepted?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json(
      { error: 'Invalid request body.' },
      { status: 400 },
    );
  }
  const context = body.context;
  if (
    (context !== 'owner' &&
      context !== 'buyer' &&
      context !== 'subscription') ||
    body.accepted !== true
  ) {
    return NextResponse.json(
      { error: 'Accept the data covenant to continue.' },
      { status: 400 },
    );
  }

  const sql = getSql();
  await sql`
    INSERT INTO user_consents (
      user_id, context, covenant_version, accepted, accepted_at, request_fingerprint
    ) VALUES (
      ${session.userId}, ${context}, ${DATA_COVENANT_VERSION}, TRUE, NOW(), ${requestFingerprint(request)}
    )
    ON CONFLICT (user_id, context, covenant_version) DO UPDATE SET
      accepted = TRUE,
      accepted_at = NOW(),
      request_fingerprint = EXCLUDED.request_fingerprint
  `;
  return NextResponse.json({
    accepted: true,
    context,
    covenantVersion: DATA_COVENANT_VERSION,
  });
}
