import { NextResponse } from 'next/server';

import { getSql, hasDatabase } from '@/db';
import propertyData from '@/data/property-data.json';

export const runtime = 'nodejs';

type ContributionBody = {
  requestId?: unknown;
  email?: unknown;
  property?: Record<string, unknown>;
  costs?: Record<string, unknown>;
};

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
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
  if (!hasDatabase()) {
    return NextResponse.json(
      { error: 'Secure storage is temporarily unavailable. Please try again shortly.' },
      { status: 503 },
    );
  }

  let body: ContributionBody;
  try {
    body = (await request.json()) as ContributionBody;
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  const requestId = requiredText(body.requestId);
  const email = requiredText(body.email)?.toLowerCase() ?? null;
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
    !email ||
    !EMAIL_PATTERN.test(email) ||
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
      { error: 'Please check the property, cost, loan, and email fields.' },
      { status: 400 },
    );
  }

  try {
    const sql = getSql();
    const rows = await sql`
      WITH existing AS (
        SELECT id, status, submitted_at
        FROM purchase_contributions
        WHERE request_id = ${requestId}
      ), contributor AS (
        INSERT INTO contributors (email)
        SELECT ${email}
        WHERE NOT EXISTS (SELECT 1 FROM existing)
        ON CONFLICT (email) DO UPDATE SET updated_at = NOW()
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
          loan_tenure_years, loan_rate
        )
        SELECT
          ${requestId}, id, ${purchasePrice}, ${stampDuty},
          ${registrationCost}, ${interiors}, ${brokerage}, ${loanAmount},
          ${loanTenureYears}, ${loanRate}
        FROM property_row
        RETURNING id, status, submitted_at
      )
      SELECT id, status, submitted_at FROM inserted
      UNION ALL
      SELECT id, status, submitted_at FROM existing
      LIMIT 1
    ` as Array<{ id: string; status: string; submitted_at: string }>;

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
