import { NextResponse } from 'next/server';

import { getSql, hasDatabase } from '@/db';
import { getSocietySummary } from '@/lib/society-evidence-data';
import {
  consentForUser,
  getUserSessionFromRequest,
  isSameOriginUserRequest,
} from '@/lib/user-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const SUBSCRIPTION_LIMIT = 100;
const SOURCE_SCREENS = new Set(['society_page', 'buyer_detail']);

function selectedSociety(request: Request) {
  const slug = new URL(request.url).searchParams.get('society')?.trim() ?? '';
  return getSocietySummary(slug);
}

export async function GET(request: Request) {
  const session = await getUserSessionFromRequest(request);
  if (!session) {
    return NextResponse.json(
      { authenticated: false, subscribed: false },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  }
  const society = selectedSociety(request);
  if (!society) {
    return NextResponse.json({ error: 'Society not found.' }, { status: 404 });
  }
  if (!hasDatabase()) {
    return NextResponse.json(
      { error: 'Subscriptions are temporarily unavailable.' },
      { status: 503 },
    );
  }

  const sql = getSql();
  const rows = (await sql`
    SELECT id, status
    FROM society_price_subscriptions
    WHERE user_id = ${session.userId} AND society_slug = ${society.slug}
    LIMIT 1
  `) as Array<{ id: string; status: 'active' | 'unsubscribed' }>;
  const subscriptionConsent = await consentForUser(
    session.userId,
    'subscription',
  );

  return NextResponse.json(
    {
      authenticated: true,
      subscribed: rows[0]?.status === 'active',
      canSubscribeWithoutPrompt: subscriptionConsent,
      subscriptionId: rows[0]?.status === 'active' ? rows[0].id : undefined,
      email: session.email,
    },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}

export async function POST(request: Request) {
  if (!isSameOriginUserRequest(request)) {
    return NextResponse.json(
      { error: 'Invalid request origin.' },
      { status: 403 },
    );
  }
  const session = await getUserSessionFromRequest(request);
  if (!session) {
    return NextResponse.json(
      { error: 'Verify your email to subscribe.' },
      { status: 401 },
    );
  }
  const society = selectedSociety(request);
  if (!society) {
    return NextResponse.json({ error: 'Society not found.' }, { status: 404 });
  }
  if (!hasDatabase()) {
    return NextResponse.json(
      { error: 'Subscriptions are temporarily unavailable.' },
      { status: 503 },
    );
  }

  let body: { sourceScreen?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json(
      { error: 'Invalid request body.' },
      { status: 400 },
    );
  }
  const sourceScreen = body.sourceScreen;
  if (typeof sourceScreen !== 'string' || !SOURCE_SCREENS.has(sourceScreen)) {
    return NextResponse.json(
      { error: 'Invalid subscription source.' },
      { status: 400 },
    );
  }
  if (!(await consentForUser(session.userId, 'subscription'))) {
    return NextResponse.json(
      { error: 'Accept price update emails to subscribe.' },
      { status: 403 },
    );
  }

  const sql = getSql();
  const existing = (await sql`
    SELECT id, status
    FROM society_price_subscriptions
    WHERE user_id = ${session.userId} AND society_slug = ${society.slug}
    LIMIT 1
  `) as Array<{ id: string; status: 'active' | 'unsubscribed' }>;

  if (!existing[0]) {
    const counts = (await sql`
      SELECT COUNT(*)::integer AS active_count
      FROM society_price_subscriptions
      WHERE user_id = ${session.userId} AND status = 'active'
    `) as Array<{ active_count: number }>;
    if (Number(counts[0]?.active_count ?? 0) >= SUBSCRIPTION_LIMIT) {
      return NextResponse.json(
        { error: 'You can follow up to 100 societies.' },
        { status: 409 },
      );
    }
  }

  const rows = (await sql`
    INSERT INTO society_price_subscriptions (
      user_id,
      society_slug,
      society_name,
      status,
      source_screen,
      unsubscribed_at,
      updated_at
    ) VALUES (
      ${session.userId},
      ${society.slug},
      ${society.name},
      'active',
      ${sourceScreen},
      NULL,
      NOW()
    )
    ON CONFLICT (user_id, society_slug) DO UPDATE SET
      society_name = EXCLUDED.society_name,
      status = 'active',
      source_screen = EXCLUDED.source_screen,
      unsubscribed_at = NULL,
      updated_at = NOW()
    RETURNING id
  `) as Array<{ id: string }>;

  return NextResponse.json({
    subscribed: true,
    subscriptionId: rows[0]?.id,
    society: { slug: society.slug, name: society.name },
    email: session.email,
  });
}

export async function DELETE(request: Request) {
  if (!isSameOriginUserRequest(request)) {
    return NextResponse.json(
      { error: 'Invalid request origin.' },
      { status: 403 },
    );
  }
  const session = await getUserSessionFromRequest(request);
  if (!session) {
    return NextResponse.json(
      { error: 'Sign in to continue.' },
      { status: 401 },
    );
  }
  const society = selectedSociety(request);
  if (!society) {
    return NextResponse.json({ error: 'Society not found.' }, { status: 404 });
  }

  const sql = getSql();
  await sql`
    UPDATE society_price_subscriptions
    SET status = 'unsubscribed', unsubscribed_at = NOW(), updated_at = NOW()
    WHERE user_id = ${session.userId} AND society_slug = ${society.slug}
  `;
  return NextResponse.json({ subscribed: false });
}
