import { NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';

import { getSql, hasDatabase } from '@/db';
import {
  prepareTransactionImport,
  type WorkbookTransactionRow,
} from '@/lib/transaction-import';
import {
  getAdminSessionFromRequest,
  isSameOriginRequest,
} from '@/lib/admin-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const CHECKSUM_PATTERN = /^[a-f0-9]{64}$/i;
const MAX_ROWS = 5_000;

type ImportRequestBody = {
  fileName?: unknown;
  checksum?: unknown;
  records?: unknown;
};

function cleanFileName(value: unknown) {
  if (typeof value !== 'string') return null;
  const name = value.trim().slice(0, 255);
  return name ? name : null;
}

export async function GET(request: Request) {
  const session = await getAdminSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }
  if (!hasDatabase()) {
    return NextResponse.json({ error: 'Database unavailable.' }, { status: 503 });
  }

  try {
    const sql = getSql();
    const imports = await sql`
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
      ORDER BY created_at DESC
      LIMIT 25
    `;
    return NextResponse.json(
      { imports },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (error) {
    console.error('Transaction import list failed.', error);
    return NextResponse.json(
      { error: 'Unable to load transaction imports.' },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
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

  let body: ImportRequestBody;
  try {
    body = (await request.json()) as ImportRequestBody;
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  const fileName = cleanFileName(body.fileName);
  const checksum = typeof body.checksum === 'string' ? body.checksum : '';
  const records = Array.isArray(body.records)
    ? (body.records as WorkbookTransactionRow[])
    : null;
  if (
    !fileName ||
    !CHECKSUM_PATTERN.test(checksum) ||
    !records?.length ||
    records.length > MAX_ROWS ||
    records.some((row) => !row || typeof row !== 'object' || Array.isArray(row))
  ) {
    return NextResponse.json(
      { error: 'Upload a valid Transactions sheet with up to 5,000 rows.' },
      { status: 400 },
    );
  }

  const prepared = prepareTransactionImport(records);
  try {
    const sql = getSql();
    const duplicate = await sql`
      SELECT id
      FROM registered_transaction_imports
      WHERE source_checksum = ${checksum.toLowerCase()}
      LIMIT 1
    ` as Array<{ id: string }>;
    if (duplicate[0]) {
      return NextResponse.json(
        {
          error:
            'This exact file has already been staged. Open the existing import to review it.',
          importId: duplicate[0].id,
        },
        { status: 409 },
      );
    }

    const batchId = randomUUID();
    const batchInsert = sql`
      INSERT INTO registered_transaction_imports (
        id,
        source_file_name,
        source_checksum,
        uploaded_by,
        submitted_rows,
        ready_rows,
        review_rows,
        rejected_rows
      ) VALUES (
        ${batchId},
        ${fileName},
        ${checksum.toLowerCase()},
        ${session.email},
        ${prepared.rows.length},
        ${prepared.readyCount},
        ${prepared.reviewCount},
        ${prepared.rejectedCount}
      )
      RETURNING id, status, created_at
    `;
    const inserts = prepared.rows.map((row) => sql`
      INSERT INTO registered_transaction_import_rows (
        import_id,
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
        qa_reasons
      ) VALUES (
        ${batchId},
        ${row.ordinal},
        ${row.sourceRecordId || null},
        ${row.location},
        ${row.sourceLocation},
        ${row.society},
        ${row.propertyType},
        ${row.unitNumber},
        ${row.floor},
        ${row.tower},
        ${row.bhk},
        ${row.registrationDate},
        ${row.rawDate},
        ${row.price},
        ${row.effectiveArea},
        ${row.pricePerSqFt},
        ${row.areaBasis},
        ${row.eventType},
        ${row.saleType},
        ${row.qaNotes},
        ${row.sourceFile},
        ${row.sourceUrl},
        ${row.qaStatus},
        ${JSON.stringify(row.qaReasons)}::jsonb
      )
    `);
    const results = await sql.transaction([batchInsert, ...inserts]);
    const batch = results[0]?.[0] as
      | { id: string; status: string; created_at: string | Date }
      | undefined;
    if (!batch) throw new Error('Import batch was not created.');

    return NextResponse.json(
      {
        import: {
          id: batch.id,
          status: batch.status,
          createdAt: new Date(batch.created_at).toISOString(),
          fileName,
          submittedRows: prepared.rows.length,
          readyRows: prepared.readyCount,
          reviewRows: prepared.reviewCount,
          rejectedRows: prepared.rejectedCount,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    console.error('Transaction import staging failed.', error);
    return NextResponse.json(
      { error: 'The transaction import could not be staged.' },
      { status: 500 },
    );
  }
}
