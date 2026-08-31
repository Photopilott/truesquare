import { NextResponse } from 'next/server';

import { getSql, hasDatabase } from '@/db';
import propertyData from '@/data/property-data.json';
import {
  consentForUser,
  getUserSessionFromRequest,
  isSameOriginUserRequest,
  requestFingerprint,
} from '@/lib/user-auth';

export const runtime = 'nodejs';

type ContributionBody = {
  requestId?: unknown;
  property?: Record<string, unknown>;
  costs?: Record<string, unknown>;
};

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function requiredText(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function optionalText(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function requiredNumber(value: unknown, minimum = 0) {
  const number = typeof value === 'number' ? value : Number.NaN;
  return Number.isFinite(number) && number >= minimum ? number : null;
}

function optionalNumber(value: unknown, minimum = 0) {
  if (value == null || value === '') return null;
  return requiredNumber(value, minimum);
}

export async function POST(request: Request) {
  if (!isSameOriginUserRequest(request)) {
    return NextResponse.json(
      { error: 'Invalid request origin.' },
      { status: 403 },
    );
  }
  if (!hasDatabase()) {
    return NextResponse.json(
      {
        error:
          'Secure storage is temporarily unavailable. Please try again shortly.',
      },
      { status: 503 },
    );
  }

  const session = await getUserSessionFromRequest(request);
  if (!session) {
    return NextResponse.json(
      { error: 'Verify your account before submitting.' },
      { status: 401 },
    );
  }
  if (!(await consentForUser(session.userId, 'owner'))) {
    return NextResponse.json(
      { error: 'Accept the current data covenant before submitting.' },
      { status: 403 },
    );
  }

  let body: ContributionBody;
  try {
    body = (await request.json()) as ContributionBody;
  } catch {
    return NextResponse.json(
      { error: 'Invalid request body.' },
      { status: 400 },
    );
  }

  const requestId = requiredText(body.requestId);
  const property = body.property ?? {};
  const costs = body.costs ?? {};
  const society = requiredText(property.society);
  const location = requiredText(property.location);
  const tower = requiredText(property.tower);
  const floor = requiredText(property.floor);
  const bhk = requiredText(property.bhk);
  const areaSqFt = requiredNumber(property.areaSqFt, 1);
  const areaType = requiredText(property.areaType);
  const carParks = requiredNumber(property.carParks, 0);
  const purchaseDate = requiredText(property.purchaseDate);
  const facing = optionalText(property.facing);
  const purchasePrice = requiredNumber(costs.purchasePrice, 1);
  const stampDuty = requiredNumber(costs.stampDuty, 0);
  const registrationCost = requiredNumber(costs.registrationCost, 0);
  const interiors = requiredNumber(costs.interiors, 0);
  const brokerage = requiredNumber(costs.brokerage, 0);
  const loanAmount = optionalNumber(costs.loanAmount, 0);
  const loanTenureYears = optionalNumber(costs.loanTenureYears, 1);
  const loanRate = optionalNumber(costs.loanRate, 0);

  const knownSociety = propertyData.societies.find(
    (item) => item.name === society && item.location === location,
  );
  const loanFields = [loanAmount, loanTenureYears, loanRate];
  const loanIsComplete = loanFields.every((value) => value != null);
  const loanIsEmpty = loanFields.every((value) => value == null);

  if (
    !requestId ||
    !UUID_PATTERN.test(requestId) ||
    !knownSociety ||
    !tower ||
    !floor ||
    !bhk ||
    areaSqFt == null ||
    !areaType ||
    carParks == null ||
    !purchaseDate ||
    !DATE_PATTERN.test(purchaseDate) ||
    purchasePrice == null ||
    stampDuty == null ||
    registrationCost == null ||
    interiors == null ||
    brokerage == null ||
    (!loanIsComplete && !loanIsEmpty)
  ) {
    return NextResponse.json(
      { error: 'Please check the property, cost, and loan fields.' },
      { status: 400 },
    );
  }

  try {
    const sql = getSql();
    const fingerprint = requestFingerprint(request);
    const rateRows = (await sql`
      SELECT
        COUNT(*) FILTER (
          WHERE c.user_id = ${session.userId}
            AND pc.submitted_at > NOW() - INTERVAL '1 hour'
        )::integer AS user_hour_count,
        COUNT(*) FILTER (
          WHERE pc.request_fingerprint = ${fingerprint}
            AND pc.submitted_at > NOW() - INTERVAL '1 hour'
        )::integer AS fingerprint_hour_count,
        COUNT(*) FILTER (
          WHERE c.user_id = ${session.userId}
            AND pc.submitted_at > NOW() - INTERVAL '1 day'
        )::integer AS user_day_count
      FROM purchase_contributions pc
      JOIN owner_properties op ON op.id = pc.property_id
      JOIN contributors c ON c.id = op.contributor_id
    `) as Array<{
      user_hour_count: number;
      fingerprint_hour_count: number;
      user_day_count: number;
    }>;
    const rate = rateRows[0];
    if (
      Number(rate?.user_hour_count ?? 0) >= 10 ||
      Number(rate?.fingerprint_hour_count ?? 0) >= 20 ||
      Number(rate?.user_day_count ?? 0) >= 30
    ) {
      return NextResponse.json(
        { error: 'Submission limit reached. Try again later.' },
        { status: 429, headers: { 'Retry-After': '3600' } },
      );
    }

    const rows = (await sql`
      WITH existing AS (
        SELECT id, status, submitted_at
        FROM purchase_contributions
        WHERE request_id = ${requestId}
      ), contributor AS (
        INSERT INTO contributors (user_id, email)
        SELECT ${session.userId}, ${session.email}
        WHERE NOT EXISTS (SELECT 1 FROM existing)
        ON CONFLICT (email) DO UPDATE SET
          user_id = ${session.userId},
          updated_at = NOW()
        RETURNING id
      ), property_row AS (
        INSERT INTO owner_properties (
          contributor_id, society, location, tower, floor, bhk, area_sq_ft,
          area_type, car_parks, purchase_date, facing
        )
        SELECT
          id, ${society}, ${location}, ${tower}, ${floor}, ${bhk}, ${areaSqFt},
          ${areaType}, ${carParks}, ${purchaseDate}, ${facing}
        FROM contributor
        RETURNING id
      ), inserted AS (
        INSERT INTO purchase_contributions (
          request_id, property_id, purchase_price, stamp_duty,
          registration_cost, interiors, brokerage, loan_amount,
          loan_tenure_years, loan_rate, request_fingerprint
        )
        SELECT
          ${requestId}, id, ${purchasePrice}, ${stampDuty},
          ${registrationCost}, ${interiors}, ${brokerage}, ${loanAmount},
          ${loanTenureYears}, ${loanRate}, ${fingerprint}
        FROM property_row
        RETURNING id, status, submitted_at
      )
      SELECT id, status, submitted_at FROM inserted
      UNION ALL
      SELECT id, status, submitted_at FROM existing
      LIMIT 1
    `) as Array<{ id: string; status: string; submitted_at: string }>;

    const saved = rows[0];
    if (!saved) throw new Error('Contribution was not persisted.');

    return NextResponse.json(
      {
        id: saved.id,
        status: saved.status,
        submittedAt: new Date(saved.submitted_at).toISOString(),
        message: 'Saved privately and queued for admin review.',
      },
      { status: 201 },
    );
  } catch (error) {
    console.error('Contribution save failed.', error);
    return NextResponse.json(
      { error: 'We could not save your contribution. Nothing was submitted.' },
      { status: 500 },
    );
  }
}
