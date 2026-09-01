import { NextResponse } from 'next/server';

import { getSql, hasDatabase } from '@/db';
import {
  getAdminSessionFromRequest,
  isSameOriginRequest,
} from '@/lib/admin-auth';
import { getSocietySummaryByName } from '@/lib/society-evidence-data';
import { notifySocietyPriceSubscribers } from '@/lib/society-subscriptions';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(
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
    return NextResponse.json({ error: 'Invalid import ID.' }, { status: 400 });
  }

  try {
    const sql = getSql();
    const batches = (await sql`
      SELECT status
      FROM registered_transaction_imports
      WHERE id = ${id}
      LIMIT 1
    `) as Array<{ status: 'staged' | 'applied' }>;
    if (!batches[0]) {
      return NextResponse.json({ error: 'Import not found.' }, { status: 404 });
    }
    if (batches[0].status === 'applied') {
      return NextResponse.json(
        { error: 'This import is already live.' },
        { status: 409 },
      );
    }

    const counts = (await sql`
      SELECT
        COUNT(*) FILTER (WHERE qa_status = 'ready')::integer AS ready_rows,
        COUNT(*) FILTER (WHERE qa_status = 'needs_review')::integer AS review_rows
      FROM registered_transaction_import_rows
      WHERE import_id = ${id}
    `) as Array<{ ready_rows: number; review_rows: number }>;
    const count = counts[0];
    if (!count?.ready_rows) {
      return NextResponse.json(
        { error: 'This import has no rows that can be published.' },
        { status: 400 },
      );
    }
    if (count.review_rows) {
      return NextResponse.json(
        {
          error:
            'Resolve or reject every needs-review row before publishing this import.',
        },
        { status: 409 },
      );
    }

    type LatestRow = {
      society: string;
      id: string;
      registration_date: string | Date | null;
      price: string | number | null;
      price_per_sq_ft: string | number | null;
    };
    const currentLatest = (await sql`
      SELECT DISTINCT ON (society)
        society,
        id,
        registration_date,
        price,
        price_per_sq_ft
      FROM registered_transactions
      WHERE society IS NOT NULL
      ORDER BY society, registration_date DESC NULLS LAST, id DESC
    `) as LatestRow[];
    const incomingLatest = (await sql`
      SELECT DISTINCT ON (society)
        society,
        source_record_id AS id,
        registration_date,
        price,
        price_per_sq_ft
      FROM registered_transaction_import_rows
      WHERE
        import_id = ${id}
        AND qa_status = 'ready'
        AND society IS NOT NULL
        AND source_record_id IS NOT NULL
      ORDER BY society, registration_date DESC NULLS LAST, source_record_id DESC
    `) as LatestRow[];
    const currentBySociety = new Map(
      currentLatest.map((row) => [
        row.society,
        [
          row.id,
          row.registration_date
            ? new Date(row.registration_date).toISOString()
            : '',
          String(row.price ?? ''),
          String(row.price_per_sq_ft ?? ''),
        ].join('|'),
      ]),
    );
    const changedSocieties = incomingLatest
      .filter((row) => {
        const fingerprint = [
          row.id,
          row.registration_date
            ? new Date(row.registration_date).toISOString()
            : '',
          String(row.price ?? ''),
          String(row.price_per_sq_ft ?? ''),
        ].join('|');
        return currentBySociety.get(row.society) !== fingerprint;
      })
      .map((row) => row.society);

    await sql.transaction([
      sql`DELETE FROM registered_transactions`,
      sql`
        INSERT INTO registered_transactions (
          id,
          location,
          society,
          tower,
          bhk,
          registration_date,
          raw_date,
          price,
          effective_area,
          price_per_sq_ft,
          area_basis,
          sale_type,
          qa_notes,
          source_file,
          source_url,
          imported_at
        )
        SELECT
          source_record_id,
          location,
          society,
          tower,
          bhk,
          registration_date,
          raw_date,
          price,
          effective_area,
          price_per_sq_ft,
          area_basis,
          sale_type,
          qa_notes,
          source_file,
          source_url,
          NOW()
        FROM registered_transaction_import_rows
        WHERE import_id = ${id} AND qa_status = 'ready'
        ORDER BY ordinal
      `,
      sql`
        UPDATE registered_transaction_imports
        SET status = 'applied', applied_at = NOW(), applied_by = ${session.email}
        WHERE id = ${id} AND status = 'staged'
      `,
    ]);

    const subscriberNotifications = [];
    for (const societyName of changedSocieties) {
      const society = getSocietySummaryByName(societyName);
      if (!society) continue;
      try {
        subscriberNotifications.push({
          society: society.slug,
          ...(await notifySocietyPriceSubscribers({
            societySlug: society.slug,
            eventType: 'verified_transaction_updated',
            eventKey: `transaction-import:${id}:${society.slug}`,
          })),
        });
      } catch (subscriberError) {
        console.error(
          `Transaction subscriber notification failed for ${society.slug}.`,
          subscriberError,
        );
      }
    }

    return NextResponse.json({
      importId: id,
      publishedRows: Number(count.ready_rows),
      message: 'Registered transaction evidence is now live.',
      subscriberNotifications,
    });
  } catch (error) {
    console.error('Transaction import apply failed.', error);
    return NextResponse.json(
      { error: 'The import could not be published.' },
      { status: 500 },
    );
  }
}
