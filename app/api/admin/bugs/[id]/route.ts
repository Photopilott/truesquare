import { NextResponse } from 'next/server';

import { getSql, hasDatabase } from '@/db';
import {
  getAdminSessionFromRequest,
  isSameOriginRequest,
} from '@/lib/admin-auth';

export const runtime = 'nodejs';

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json(
      { error: 'Invalid request origin.' },
      { status: 403 },
    );
  }
  const session = await getAdminSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }
  if (!hasDatabase()) {
    return NextResponse.json(
      { error: 'Database unavailable.' },
      { status: 503 },
    );
  }

  const { id } = await params;
  if (!UUID_PATTERN.test(id)) {
    return NextResponse.json({ error: 'Invalid bug ID.' }, { status: 400 });
  }

  try {
    const sql = getSql();
    const rows = await sql`
      UPDATE bug_reports
      SET status = 'resolved', resolved_at = NOW(), resolved_by = ${session.email}
      WHERE id = ${id} AND status = 'open'
      RETURNING id
    `;
    if (!rows[0]) {
      return NextResponse.json(
        { error: 'Open bug report not found.' },
        { status: 404 },
      );
    }
    return NextResponse.json({ id, status: 'resolved' });
  } catch (error) {
    console.error('Bug report resolution failed.', error);
    return NextResponse.json(
      { error: 'The bug report could not be resolved.' },
      { status: 500 },
    );
  }
}
