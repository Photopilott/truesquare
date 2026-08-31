import { NextResponse } from 'next/server';

import { getSql, hasDatabase } from '@/db';
import {
  getAdminSessionFromRequest,
  isSameOriginRequest,
} from '@/lib/admin-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getAdminSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }
  if (!hasDatabase()) {
    return NextResponse.json({ error: 'Database unavailable.' }, { status: 503 });
  }

  const { id } = await params;
  if (!UUID_PATTERN.test(id)) {
    return NextResponse.json({ error: 'Invalid import ID.' }, { status: 400 });
  }

  try {
    const sql = getSql();
    const [imports, rows] = await Promise.all([
      sql`
        SELECT
          id,
          source_file_name,
          submitted_rows,
          ready_rows,
          review_rows,
          rejected_rows,
          status,
          uploaded_by,
          created_at,
          applied_at,
          applied_by
        FROM registered_transaction_imports
        WHERE id = ${id}
        LIMIT 1
      `,
      sql`
        SELECT
          id,
          ordinal,
          source_record_id,
          location,
          source_location,
          society,
          property_type,
          unit_number,
          floor,
          tower,
          bhk,
          registration_date,
          raw_date,
          price,
          effective_area,
          price_per_sq_ft,
          area_basis,
          event_type,
          sale_type,
          qa_notes,
          source_file,
          source_url,
          qa_status,
          qa_reasons,
          reviewed_at,
          reviewed_by,
          review_notes
        FROM registered_transaction_import_rows
        WHERE import_id = ${id}
        ORDER BY ordinal
      `,
    ]);
    if (!imports[0]) {
      return NextResponse.json({ error: 'Import not found.' }, { status: 404 });
    }
    return NextResponse.json(
      { import: imports[0], rows },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (error) {
    console.error('Transaction import detail failed.', error);
    return NextResponse.json(
      { error: 'Unable to load this import.' },
      { status: 500 },
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ error: 'Invalid request origin.' }, { status: 403 });
  }
  const session = await getAdminSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }
  if (!hasDatabase()) {
    return NextResponse.json({ error: 'Database unavailable.' }, { status: 503 });
  }

  const { id } = await params;
  if (!UUID_PATTERN.test(id)) {
    return NextResponse.json({ error: 'Invalid import ID.' }, { status: 400 });
  }

  let body: { rowId?: unknown; status?: unknown; notes?: unknown };
  try {
    body = (await request.json()) as {
      rowId?: unknown;
      status?: unknown;
      notes?: unknown;
    };
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  const rowId = typeof body.rowId === 'string' ? body.rowId : '';
  const status = body.status;
  const notes =
    typeof body.notes === 'string' ? body.notes.trim().slice(0, 2_000) : null;
  if (!UUID_PATTERN.test(rowId) || status !== 'rejected') {
    return NextResponse.json(
      { error: 'Only a needs-review row can be marked rejected.' },
      { status: 400 },
    );
  }

  try {
    const sql = getSql();
    const updated = await sql`
      UPDATE registered_transaction_import_rows rows
      SET
        qa_status = 'rejected',
        reviewed_at = NOW(),
        reviewed_by = ${session.email},
        review_notes = ${notes}
      FROM registered_transaction_imports imports
      WHERE
        rows.id = ${rowId}
        AND rows.import_id = ${id}
        AND rows.qa_status = 'needs_review'
        AND imports.id = rows.import_id
        AND imports.status = 'staged'
      RETURNING rows.id
    ` as Array<{ id: string }>;
    if (!updated[0]) {
      return NextResponse.json(
        { error: 'That row can no longer be changed.' },
        { status: 409 },
      );
    }

    await sql`
      UPDATE registered_transaction_imports
      SET
        review_rows = (
          SELECT COUNT(*)::integer
          FROM registered_transaction_import_rows
          WHERE import_id = ${id} AND qa_status = 'needs_review'
        ),
        rejected_rows = (
          SELECT COUNT(*)::integer
          FROM registered_transaction_import_rows
          WHERE import_id = ${id} AND qa_status = 'rejected'
        )
      WHERE id = ${id}
    `;

    return NextResponse.json({ rowId, status: 'rejected' });
  } catch (error) {
    console.error('Transaction import row review failed.', error);
    return NextResponse.json(
      { error: 'The transaction row could not be reviewed.' },
      { status: 500 },
    );
  }
}
