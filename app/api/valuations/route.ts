import { NextResponse } from 'next/server';

import { getSql, hasDatabase } from '@/db';
import { getUserSessionFromRequest } from '@/lib/user-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const session = await getUserSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }
  if (!hasDatabase()) {
    return NextResponse.json({ error: 'Database unavailable.' }, { status: 503 });
  }

  try {
    const sql = getSql();
    const snapshots = await sql`
      SELECT
        snapshots.id,
        snapshots.created_at,
        snapshots.match_tier,
        snapshots.match_label,
        snapshots.confidence,
        snapshots.supporting_transaction_count,
        snapshots.estimate,
        snapshots.low,
        snapshots.high,
        snapshots.owner_evidence_count,
        properties.society,
        properties.location,
        properties.bhk,
        properties.area_sq_ft
      FROM valuation_snapshots snapshots
      JOIN purchase_contributions contributions
        ON contributions.id = snapshots.contribution_id
      JOIN owner_properties properties
        ON properties.id = contributions.property_id
      JOIN contributors contributors
        ON contributors.id = properties.contributor_id
      WHERE contributors.user_id = ${session.userId}
      ORDER BY snapshots.created_at DESC
      LIMIT 50
    `;
    return NextResponse.json(
      { snapshots },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (error) {
    console.error('Valuation snapshot list failed.', error);
    return NextResponse.json(
      { error: 'Unable to load your valuation history.' },
      { status: 500 },
    );
  }
}
