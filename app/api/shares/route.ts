import { randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';

import { getSql, hasDatabase } from '@/db';
import propertyData from '@/data/property-data.json';
import {
  getUserSessionFromRequest,
  isSameOriginUserRequest,
  requestFingerprint,
} from '@/lib/user-auth';
import { isShareSourceScreen } from '@/lib/share-tracking';

export const runtime = 'nodejs';

type ShareBody = {
  contentType?: unknown;
  contentId?: unknown;
  sourceScreen?: unknown;
  messageVariant?: unknown;
};

export async function POST(request: Request) {
  if (!isSameOriginUserRequest(request)) {
    return NextResponse.json(
      { error: 'Invalid request origin.' },
      { status: 403 },
    );
  }
  let body: ShareBody;
  try {
    body = (await request.json()) as ShareBody;
  } catch {
    return NextResponse.json(
      { error: 'Invalid request body.' },
      { status: 400 },
    );
  }
  const contentId = typeof body.contentId === 'string' ? body.contentId : '';
  const messageVariant =
    typeof body.messageVariant === 'string' ? body.messageVariant : '';
  if (
    body.contentType !== 'society' ||
    !propertyData.societies.some((society) => society.slug === contentId) ||
    !isShareSourceScreen(body.sourceScreen) ||
    messageVariant !== 'society_benchmark_private_v1'
  ) {
    return NextResponse.json({ error: 'Unsupported share.' }, { status: 400 });
  }

  const shareId = randomUUID();
  if (!hasDatabase()) {
    return NextResponse.json({ shareId, tracked: false });
  }
  try {
    const sql = getSql();
    const session = await getUserSessionFromRequest(request);
    const fingerprint = requestFingerprint(request);
    const recent = (await sql`
      SELECT COUNT(*)::integer AS count
      FROM share_records
      WHERE request_fingerprint = ${fingerprint}
        AND created_at > NOW() - INTERVAL '1 hour'
    `) as Array<{ count: number }>;
    if (Number(recent[0]?.count ?? 0) >= 100) {
      return NextResponse.json(
        { error: 'Share limit reached. Try again later.' },
        { status: 429, headers: { 'Retry-After': '3600' } },
      );
    }
    await sql`
      INSERT INTO share_records (
        id, created_by_user_id, content_type, content_id, source_screen,
        message_variant, request_fingerprint
      ) VALUES (
        ${shareId}, ${session?.userId ?? null}, 'society', ${contentId},
        ${body.sourceScreen}, ${messageVariant}, ${fingerprint}
      )
    `;
    return NextResponse.json({ shareId, tracked: true });
  } catch (error) {
    console.error('Unable to save share record.', error);
    return NextResponse.json({ shareId, tracked: false });
  }
}
