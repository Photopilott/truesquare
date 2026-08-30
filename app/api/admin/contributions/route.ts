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

  const url = new URL(request.url);
  const requestedStatus = url.searchParams.get('status') ?? 'pending';
  const status = ['pending', 'approved', 'rejected'].includes(requestedStatus)
    ? requestedStatus
    : 'pending';

  try {
    const sql = getSql();
    const rows = await sql`
      SELECT
        pc.id,
        pc.status,
        pc.submitted_at,
        pc.purchase_price,
        pc.stamp_duty,
        pc.registration_cost,
        pc.interiors,
        pc.brokerage,
        pc.loan_amount,
        pc.loan_tenure_years,
        pc.loan_rate,
        c.email,
        op.society,
        op.location,
        op.tower,
        op.floor,
        op.bhk,
        op.area_sq_ft,
        op.area_type,
        op.car_parks,
        op.purchase_date,
        op.facing,
        ROUND(pc.purchase_price::numeric / NULLIF(op.area_sq_ft, 0), 2) AS price_per_sq_ft
      FROM purchase_contributions pc
      JOIN owner_properties op ON op.id = pc.property_id
      JOIN contributors c ON c.id = op.contributor_id
      WHERE pc.status = ${status}
      ORDER BY pc.submitted_at DESC
      LIMIT 200
    `;

    return NextResponse.json({ contributions: rows, admin: session.email }, {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (error) {
    console.error('Admin contribution list failed.', error);
    return NextResponse.json({ error: 'Unable to load contributions.' }, { status: 500 });
  }
}
