import 'server-only';

import { getSql, hasDatabase } from '@/db';
import { getPublicSocietyEvidence } from '@/lib/society-evidence-data';
import { sendSocietyPriceUpdateEmail } from '@/lib/user-email';

export type SocietyPriceUpdateEvent =
  | 'owner_benchmark_updated'
  | 'verified_transaction_updated';

type DeliveryResult = {
  attempted: number;
  sent: number;
  failed: number;
};

export async function notifySocietyPriceSubscribers({
  societySlug,
  eventType,
  eventKey,
}: {
  societySlug: string;
  eventType: SocietyPriceUpdateEvent;
  eventKey: string;
}): Promise<DeliveryResult> {
  if (!hasDatabase()) return { attempted: 0, sent: 0, failed: 0 };
  const evidence = await getPublicSocietyEvidence(societySlug);
  if (!evidence) return { attempted: 0, sent: 0, failed: 0 };

  const sql = getSql();
  const subscriptions = (await sql`
    SELECT subscriptions.id, users.email
    FROM society_price_subscriptions subscriptions
    JOIN app_users users ON users.id = subscriptions.user_id
    WHERE
      subscriptions.society_slug = ${societySlug}
      AND subscriptions.status = 'active'
    ORDER BY subscriptions.created_at
  `) as Array<{ id: string; email: string }>;

  const result: DeliveryResult = {
    attempted: subscriptions.length,
    sent: 0,
    failed: 0,
  };

  for (const subscription of subscriptions) {
    const deliveries = (await sql`
      INSERT INTO society_subscription_deliveries (
        subscription_id,
        recipient_email,
        society_slug,
        society_name,
        event_type,
        event_key,
        status,
        attempt_count
      ) VALUES (
        ${subscription.id},
        ${subscription.email},
        ${societySlug},
        ${evidence.society.name},
        ${eventType},
        ${eventKey},
        'pending',
        0
      )
      ON CONFLICT (subscription_id, event_key) DO NOTHING
      RETURNING id
    `) as Array<{ id: string }>;
    const delivery = deliveries[0];
    if (!delivery) {
      result.attempted -= 1;
      continue;
    }

    try {
      await sendSocietyPriceUpdateEmail({
        email: subscription.email,
        societyName: evidence.society.name,
        societySlug,
        eventType,
        medianPrice: evidence.registeredMedianPrice,
        latestPricePerSqFt: evidence.latestRegisteredPricePerSqFt,
        latestSalePrice: evidence.latestRegisteredPrice,
        latestSaleDate: evidence.latestEvidenceDate,
        supportingSaleCount: evidence.registeredCount,
        publicOwnerContributionCount: evidence.publicOwnerContributionCount,
      });
      await sql`
        UPDATE society_subscription_deliveries
        SET status = 'sent', attempt_count = 1, sent_at = NOW(), last_error = NULL
        WHERE id = ${delivery.id}
      `;
      result.sent += 1;
    } catch (error) {
      const detail =
        error instanceof Error
          ? error.message.slice(0, 2_000)
          : 'Unknown society update delivery error.';
      await sql`
        UPDATE society_subscription_deliveries
        SET status = 'failed', attempt_count = 1, last_error = ${detail}
        WHERE id = ${delivery.id}
      `;
      result.failed += 1;
      console.error('Society price update delivery failed.', error);
    }
  }

  return result;
}
