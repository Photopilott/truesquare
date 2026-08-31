import { NextResponse } from 'next/server';

import { getSql, hasDatabase } from '@/db';
import {
  getAdminSessionFromRequest,
  isSameOriginRequest,
} from '@/lib/admin-auth';
import { sendContributionReviewEmail } from '@/lib/user-email';

export const runtime = 'nodejs';

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(
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
    return NextResponse.json({ error: 'Invalid notification ID.' }, { status: 400 });
  }

  try {
    const sql = getSql();
    const rows = await sql`
      SELECT
        deliveries.id,
        deliveries.recipient_email,
        deliveries.event_type,
        deliveries.status,
        properties.society
      FROM notification_deliveries deliveries
      JOIN purchase_contributions contributions ON contributions.id = deliveries.contribution_id
      JOIN owner_properties properties ON properties.id = contributions.property_id
      WHERE deliveries.id = ${id}
      LIMIT 1
    ` as Array<{
      id: string;
      recipient_email: string;
      event_type: 'contribution_approved' | 'contribution_rejected';
      status: 'pending' | 'sent' | 'failed';
      society: string;
    }>;
    const delivery = rows[0];
    if (!delivery) {
      return NextResponse.json({ error: 'Notification not found.' }, { status: 404 });
    }
    if (delivery.status === 'sent') {
      return NextResponse.json({ error: 'This notification was already sent.' }, { status: 409 });
    }

    try {
      await sendContributionReviewEmail({
        email: delivery.recipient_email,
        society: delivery.society,
        status:
          delivery.event_type === 'contribution_approved'
            ? 'approved'
            : 'rejected',
      });
      await sql`
        UPDATE notification_deliveries
        SET status = 'sent', attempt_count = attempt_count + 1, sent_at = NOW(), last_error = NULL
        WHERE id = ${id}
      `;
      return NextResponse.json({ id, status: 'sent' });
    } catch (notificationError) {
      const detail =
        notificationError instanceof Error
          ? notificationError.message.slice(0, 2_000)
          : 'Unknown notification error.';
      await sql`
        UPDATE notification_deliveries
        SET status = 'failed', attempt_count = attempt_count + 1, last_error = ${detail}
        WHERE id = ${id}
      `;
      return NextResponse.json(
        { error: 'The email could not be sent. It remains available to retry.' },
        { status: 502 },
      );
    }
  } catch (error) {
    console.error('Notification retry failed.', error);
    return NextResponse.json(
      { error: 'Unable to retry the notification.' },
      { status: 500 },
    );
  }
}
