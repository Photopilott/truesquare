import { NextResponse } from 'next/server';

import { getSql, hasDatabase } from '@/db';
import { getAdminSessionFromRequest } from '@/lib/admin-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

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
    const [summaryRows, deliveries] = await Promise.all([
      sql`
        SELECT
          (SELECT COUNT(*)::integer FROM purchase_contributions WHERE status = 'pending') AS pending_contributions,
          (SELECT COUNT(*)::integer FROM registered_transaction_imports WHERE status = 'staged') AS staged_imports,
          (
            SELECT COUNT(*)::integer
            FROM registered_transaction_import_rows rows
            JOIN registered_transaction_imports imports ON imports.id = rows.import_id
            WHERE imports.status = 'staged' AND rows.qa_status = 'needs_review'
          ) AS import_rows_needing_review,
          (SELECT COUNT(*)::integer FROM notification_deliveries WHERE status = 'failed') AS failed_notifications
      `,
      sql`
        SELECT
          deliveries.id,
          deliveries.event_type,
          deliveries.recipient_email,
          deliveries.status,
          deliveries.attempt_count,
          deliveries.last_error,
          deliveries.created_at,
          deliveries.sent_at,
          properties.society,
          properties.bhk
        FROM notification_deliveries deliveries
        JOIN purchase_contributions contributions ON contributions.id = deliveries.contribution_id
        JOIN owner_properties properties ON properties.id = contributions.property_id
        ORDER BY deliveries.created_at DESC
        LIMIT 25
      `,
    ]);

    return NextResponse.json(
      { summary: summaryRows[0], deliveries },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (error) {
    console.error('Admin operations summary failed.', error);
    return NextResponse.json(
      { error: 'Unable to load admin operations.' },
      { status: 500 },
    );
  }
}
