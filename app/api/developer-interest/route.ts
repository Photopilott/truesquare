import { NextResponse } from 'next/server';

import { getSql, hasDatabase } from '@/db';
import {
  DEVELOPER_INTEREST_CONSENT_VERSION,
  parseDeveloperInterest,
} from '@/lib/developer-interest';
import { isSameOriginUserRequest, requestFingerprint } from '@/lib/user-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  if (!isSameOriginUserRequest(request)) {
    return NextResponse.json(
      { error: 'Invalid request origin.' },
      { status: 403 },
    );
  }
  if (!hasDatabase()) {
    return NextResponse.json(
      { error: 'Report requests are temporarily unavailable.' },
      { status: 503 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: 'Invalid request body.' },
      { status: 400 },
    );
  }

  const parsed = parseDeveloperInterest(body);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  try {
    const sql = getSql();
    const fingerprint = requestFingerprint(request);
    const rateRows = (await sql`
      SELECT
        COUNT(*) FILTER (
          WHERE request_fingerprint = ${fingerprint}
            AND created_at > NOW() - INTERVAL '1 hour'
        )::integer AS fingerprint_hour_count,
        COUNT(*) FILTER (
          WHERE email = ${parsed.data.email}
            AND created_at > NOW() - INTERVAL '24 hours'
        )::integer AS email_day_count
      FROM developer_interest_submissions
    `) as Array<{
      fingerprint_hour_count: number;
      email_day_count: number;
    }>;
    const rate = rateRows[0];
    if (
      Number(rate?.fingerprint_hour_count ?? 0) >= 8 ||
      Number(rate?.email_day_count ?? 0) >= 12
    ) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429 },
      );
    }

    const rows = (await sql`
      INSERT INTO developer_interest_submissions (
        audience,
        developer,
        project,
        buying_stage,
        relationship,
        experience,
        email,
        email_opt_in,
        consent_version,
        request_fingerprint
      ) VALUES (
        ${parsed.data.audience},
        ${parsed.data.developer},
        ${parsed.data.project},
        ${parsed.data.buyingStage},
        ${parsed.data.relationship},
        ${parsed.data.experience},
        ${parsed.data.email},
        TRUE,
        ${DEVELOPER_INTEREST_CONSENT_VERSION},
        ${fingerprint}
      )
      RETURNING id
    `) as Array<{ id: string }>;

    return NextResponse.json(
      {
        saved: true,
        submissionId: rows[0]?.id,
        message:
          parsed.data.audience === 'buyer'
            ? 'Developer report requested.'
            : 'Owner experience received.',
      },
      { status: 201 },
    );
  } catch (error) {
    console.error('Developer interest submission failed.', error);
    return NextResponse.json(
      { error: 'Unable to save your request right now.' },
      { status: 500 },
    );
  }
}
