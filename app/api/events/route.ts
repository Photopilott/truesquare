import { NextResponse } from 'next/server';

import { getSql, hasDatabase } from '@/db';
import propertyData from '@/data/property-data.json';
import { isSameOriginUserRequest, requestFingerprint } from '@/lib/user-auth';
import {
  isProductEventName,
  isShareSourceScreen,
  safeEventMetadata,
  UUID_PATTERN,
} from '@/lib/share-tracking';

export const runtime = 'nodejs';

type EventBody = {
  eventName?: unknown;
  shareId?: unknown;
  contentType?: unknown;
  contentId?: unknown;
  sourceScreen?: unknown;
  metadata?: unknown;
};

export async function POST(request: Request) {
  if (!isSameOriginUserRequest(request)) {
    return NextResponse.json(
      { error: 'Invalid request origin.' },
      { status: 403 },
    );
  }
  let body: EventBody;
  try {
    body = (await request.json()) as EventBody;
  } catch {
    return NextResponse.json(
      { error: 'Invalid request body.' },
      { status: 400 },
    );
  }
  const contentId = typeof body.contentId === 'string' ? body.contentId : '';
  const shareId =
    typeof body.shareId === 'string' && UUID_PATTERN.test(body.shareId)
      ? body.shareId
      : null;
  if (
    !isProductEventName(body.eventName) ||
    body.contentType !== 'society' ||
    !propertyData.societies.some((society) => society.slug === contentId) ||
    !isShareSourceScreen(body.sourceScreen)
  ) {
    return NextResponse.json({ error: 'Unsupported event.' }, { status: 400 });
  }
  if (!hasDatabase()) return NextResponse.json({ tracked: false });

  try {
    const sql = getSql();
    const fingerprint = requestFingerprint(request);
    const recent = (await sql`
      SELECT COUNT(*)::integer AS count
      FROM product_events
      WHERE request_fingerprint = ${fingerprint}
        AND created_at > NOW() - INTERVAL '1 hour'
    `) as Array<{ count: number }>;
    if (Number(recent[0]?.count ?? 0) >= 300) {
      return NextResponse.json({ tracked: false }, { status: 202 });
    }
    await sql`
      INSERT INTO product_events (
        share_id, event_name, content_type, content_id, source_screen,
        metadata, request_fingerprint
      ) VALUES (
        ${shareId}, ${body.eventName}, 'society', ${contentId},
        ${body.sourceScreen}, ${JSON.stringify(safeEventMetadata(body.metadata))}::jsonb,
        ${fingerprint}
      )
    `;
    return NextResponse.json({ tracked: true });
  } catch (error) {
    console.error('Unable to save product event.', error);
    return NextResponse.json({ tracked: false }, { status: 202 });
  }
}
