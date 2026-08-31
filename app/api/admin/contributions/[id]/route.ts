import { NextResponse } from 'next/server';

import { getSql, hasDatabase } from '@/db';
import {
  getAdminSessionFromRequest,
  isSameOriginRequest,
} from '@/lib/admin-auth';
import { MINIMUM_PUBLIC_CONTRIBUTIONS } from '@/lib/owner-aggregates';
import { sendContributionReviewEmail } from '@/lib/user-email';

export const runtime = 'nodejs';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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
    return NextResponse.json({ error: 'Invalid contribution ID.' }, { status: 400 });
  }

  let body: { status?: unknown; notes?: unknown };
  try {
    body = (await request.json()) as { status?: unknown; notes?: unknown };
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }
  const status = body.status;
  const notes = typeof body.notes === 'string' ? body.notes.trim().slice(0, 2000) : null;
  if (status !== 'approved' && status !== 'rejected') {
    return NextResponse.json(
      { error: 'Status must be approved or rejected.' },
      { status: 400 },
    );
  }

  try {
    const sql = getSql();
    const targets = await sql`
      SELECT pc.status, c.email, op.society, op.location, op.bhk
      FROM purchase_contributions pc
      JOIN owner_properties op ON op.id = pc.property_id
      JOIN contributors c ON c.id = op.contributor_id
      WHERE pc.id = ${id}
      LIMIT 1
    ` as Array<{
      status: 'pending' | 'approved' | 'rejected';
      email: string;
      society: string;
      location: string;
      bhk: string;
    }>;
    const target = targets[0];
    if (!target) {
      return NextResponse.json({ error: 'Contribution not found.' }, { status: 404 });
    }
    if (target.status !== 'pending') {
      return NextResponse.json(
        { error: 'This contribution has already been reviewed.' },
        { status: 409 },
      );
    }

    const results = await sql.transaction([
      sql`
        UPDATE purchase_contributions
        SET
          status = ${status},
          reviewed_at = NOW(),
          reviewed_by = ${session.email},
          review_notes = ${notes}
        WHERE id = ${id}
      `,
      sql`
        DELETE FROM owner_price_aggregates
        WHERE society = ${target.society} AND bhk = ${target.bhk}
      `,
      sql`
        INSERT INTO owner_price_aggregates (
          society,
          location,
          bhk,
          approved_count,
          min_price_per_sq_ft,
          median_price_per_sq_ft,
          max_price_per_sq_ft,
          updated_at
        )
        SELECT
          op.society,
          op.location,
          op.bhk,
          COUNT(*)::integer,
          MIN(pc.purchase_price::numeric / NULLIF(op.area_sq_ft, 0)),
          PERCENTILE_CONT(0.5) WITHIN GROUP (
            ORDER BY pc.purchase_price::numeric / NULLIF(op.area_sq_ft, 0)
          ),
          MAX(pc.purchase_price::numeric / NULLIF(op.area_sq_ft, 0)),
          NOW()
        FROM purchase_contributions pc
        JOIN owner_properties op ON op.id = pc.property_id
        WHERE
          pc.status = 'approved'
          AND op.society = ${target.society}
          AND op.bhk = ${target.bhk}
        GROUP BY op.society, op.location, op.bhk
        HAVING COUNT(*) >= ${MINIMUM_PUBLIC_CONTRIBUTIONS}
        ON CONFLICT (society, bhk) DO UPDATE SET
          location = EXCLUDED.location,
          approved_count = EXCLUDED.approved_count,
          min_price_per_sq_ft = EXCLUDED.min_price_per_sq_ft,
          median_price_per_sq_ft = EXCLUDED.median_price_per_sq_ft,
          max_price_per_sq_ft = EXCLUDED.max_price_per_sq_ft,
          updated_at = EXCLUDED.updated_at
      `,
      sql`
        INSERT INTO notification_deliveries (
          contribution_id,
          recipient_email,
          event_type,
          status,
          attempt_count
        ) VALUES (
          ${id},
          ${target.email},
          ${status === 'approved'
            ? 'contribution_approved'
            : 'contribution_rejected'},
          'pending',
          0
        )
        RETURNING id
      `,
    ]);

    const delivery = results[3]?.[0] as { id: string } | undefined;
    if (!delivery) throw new Error('Notification record was not created.');

    let notificationStatus: 'sent' | 'failed' = 'sent';
    try {
      await sendContributionReviewEmail({
        email: target.email,
        society: target.society,
        status,
      });
      await sql`
        UPDATE notification_deliveries
        SET status = 'sent', attempt_count = attempt_count + 1, sent_at = NOW(), last_error = NULL
        WHERE id = ${delivery.id}
      `;
    } catch (notificationError) {
      notificationStatus = 'failed';
      const detail =
        notificationError instanceof Error
          ? notificationError.message.slice(0, 2_000)
          : 'Unknown notification error.';
      await sql`
        UPDATE notification_deliveries
        SET status = 'failed', attempt_count = attempt_count + 1, last_error = ${detail}
        WHERE id = ${delivery.id}
      `;
      console.error('Owner review notification failed.', notificationError);
    }

    return NextResponse.json({
      id,
      status,
      aggregateRecalculated: true,
      notification: { id: delivery.id, status: notificationStatus },
    });
  } catch (error) {
    console.error('Admin contribution review failed.', error);
    return NextResponse.json({ error: 'Unable to review contribution.' }, { status: 500 });
  }
}
