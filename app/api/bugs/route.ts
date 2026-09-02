import { NextResponse } from 'next/server';

import { getSql, hasDatabase } from '@/db';
import {
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
  if (!hasDatabase()) {
    return NextResponse.json(
      { error: 'Bug tracking is temporarily unavailable.' },
      { status: 503 },
    );
  }

  let body: { message?: unknown; pagePath?: unknown };
  try {
    body = (await request.json()) as {
      message?: unknown;
      pagePath?: unknown;
    };
  } catch {
    return NextResponse.json(
      { error: 'Invalid request body.' },
      { status: 400 },
    );
  }

  const message = typeof body.message === 'string' ? body.message.trim() : '';
  const pagePath =
    typeof body.pagePath === 'string' ? body.pagePath.trim() : '';
  if (
    message.length < 10 ||
    message.length > 2000 ||
    !pagePath.startsWith('/') ||
    pagePath.startsWith('//') ||
    pagePath.length > 500
  ) {
    return NextResponse.json(
      { error: 'Please add a clear bug description.' },
      { status: 400 },
    );
  }

  try {
    const sql = getSql();
    const session = await getUserSessionFromRequest(request);
    const fingerprint = requestFingerprint(request);
    const recentRows = (await sql`
      SELECT COUNT(*)::integer AS report_count
      FROM bug_reports
      WHERE request_fingerprint = ${fingerprint}
        AND created_at > NOW() - INTERVAL '1 hour'
    `) as Array<{ report_count: number }>;
    if (Number(recentRows[0]?.report_count ?? 0) >= 5) {
      return NextResponse.json(
        { error: 'Bug report limit reached. Please try again later.' },
        { status: 429, headers: { 'Retry-After': '3600' } },
      );
    }

    const rows = (await sql`
      INSERT INTO bug_reports (
        user_id,
        reporter_email,
        page_path,
        message,
        request_fingerprint
      ) VALUES (
        ${session?.userId ?? null},
        ${session?.email ?? null},
        ${pagePath},
        ${message},
        ${fingerprint}
      )
      RETURNING id, created_at
    `) as Array<{ id: string; created_at: string | Date }>;

    return NextResponse.json(
      {
        id: rows[0]?.id,
        createdAt: rows[0]
          ? new Date(rows[0].created_at).toISOString()
          : undefined,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error('Bug report save failed.', error);
    return NextResponse.json(
      { error: 'The bug report could not be saved.' },
      { status: 500 },
    );
  }
}
