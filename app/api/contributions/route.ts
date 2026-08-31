import { NextResponse } from 'next/server';

import { getSql, hasDatabase } from '@/db';
import propertyData from '@/data/property-data.json';
import {
  calculateValuation,
  type TransactionRecord,
} from '@/lib/valuation-engine';
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
        SELECT id, status, submitted_at, property_id
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
        RETURNING id, status, submitted_at, property_id
      )
      SELECT id, status, submitted_at, property_id FROM inserted
      UNION ALL
      SELECT id, status, submitted_at, property_id FROM existing
      LIMIT 1
    `) as Array<{
      id: string;
      status: string;
      submitted_at: string;
      property_id: string;
    }>;

    const saved = rows[0];
    if (!saved) throw new Error('Contribution was not persisted.');

    const existingSnapshots = await sql`
      SELECT id, created_at
      FROM valuation_snapshots
      WHERE contribution_id = ${saved.id}
      LIMIT 1
    ` as Array<{ id: string; created_at: string | Date }>;

    let snapshot = existingSnapshots[0];
    if (!snapshot) {
      const transactionRows = await sql`
        SELECT
          id,
          location,
          society,
          tower,
          bhk,
          registration_date,
          raw_date,
          price,
          effective_area,
          price_per_sq_ft,
          area_basis,
          sale_type,
          qa_notes,
          source_file,
          source_url
        FROM registered_transactions
        ORDER BY society, registration_date DESC NULLS LAST, id
      ` as Array<{
        id: string;
        location: string;
        society: string;
        tower: string | null;
        bhk: string | null;
        registration_date: string | Date | null;
        raw_date: string;
        price: string | number | null;
        effective_area: string | number | null;
        price_per_sq_ft: string | number | null;
        area_basis: string | null;
        sale_type: string | null;
        qa_notes: string | null;
        source_file: string;
        source_url: string;
      }>;
      const ownerAggregateRows = await sql`
        SELECT
          society: society!,
          location: location!,
          bhk: bhk!,
          approved_count,
          min_price_per_sq_ft,
          median_price_per_sq_ft,
          max_price_per_sq_ft,
          updated_at
        FROM owner_price_aggregates
        WHERE society = ${society} AND bhk = ${bhk}
      ` as Array<{
        society: string;
        location: string;
        bhk: string;
        approved_count: number;
        min_price_per_sq_ft: string | number;
        median_price_per_sq_ft: string | number;
        max_price_per_sq_ft: string | number;
        updated_at: string | Date;
      }>;
      const transactions: TransactionRecord[] = transactionRows.map((row) => ({
        id: row.id,
        location: row.location,
        society: row.society,
        tower: row.tower,
        bhk: row.bhk,
        registrationDate: row.registration_date
          ? new Date(row.registration_date).toISOString().slice(0, 10)
          : null,
        rawDate: row.raw_date,
        price: row.price == null ? null : Number(row.price),
        effectiveArea:
          row.effective_area == null ? null : Number(row.effective_area),
        pricePerSqFt:
          row.price_per_sq_ft == null ? null : Number(row.price_per_sq_ft),
        areaBasis: row.area_basis,
        saleType: row.sale_type,
        qaNotes: row.qa_notes,
        sourceFile: row.source_file,
        sourceUrl: row.source_url,
      }));
      const ownerAggregates = ownerAggregateRows.map((row) => ({
        society: row.society,
        location: row.location,
        bhk: row.bhk,
        approvedCount: Number(row.approved_count),
        minPricePerSqFt: Number(row.min_price_per_sq_ft),
        medianPricePerSqFt: Number(row.median_price_per_sq_ft),
        maxPricePerSqFt: Number(row.max_price_per_sq_ft),
        updatedAt: new Date(row.updated_at).toISOString(),
      }));
      const valuation = calculateValuation(
        {
          society: society!,
          location: location!,
          bhk: bhk!,
          areaSqFt,
          purchaseDate,
          purchasePrice,
          stampDuty,
          registrationCost,
          interiors,
          brokerage,
          loanAmount,
          loanTenureYears,
          loanRate,
        },
        transactions,
        ownerAggregates,
      );
      const toWholeRupee = (value: number | null) =>
        value == null ? null : Math.round(value);
      const createdSnapshots = await sql`
        INSERT INTO valuation_snapshots (
          contribution_id,
          algorithm_version,
          match_tier,
          match_label,
          confidence,
          supporting_transaction_ids,
          supporting_transaction_count,
          estimate,
          low,
          high,
          acquisition_cost,
          absolute_appreciation,
          return_after_costs,
          annualized_return,
          loan_interest,
          owner_evidence_count,
          owner_evidence_min_price_per_sq_ft,
          owner_evidence_median_price_per_sq_ft,
          owner_evidence_max_price_per_sq_ft,
          input_snapshot
        ) VALUES (
          ${saved.id},
          'v1',
          ${valuation.matchTier},
          ${valuation.matchLabel},
          ${valuation.confidence},
          ${JSON.stringify(valuation.comparables.map((record) => record.id))}::jsonb,
          ${valuation.comparables.length},
          ${toWholeRupee(valuation.estimate)},
          ${toWholeRupee(valuation.low)},
          ${toWholeRupee(valuation.high)},
          ${Math.round(valuation.acquisitionCost)},
          ${toWholeRupee(valuation.absoluteAppreciation)},
          ${toWholeRupee(valuation.returnAfterCosts)},
          ${valuation.annualizedReturn},
          ${Math.round(valuation.loanInterest)},
          ${valuation.ownerAggregate?.approvedCount ?? 0},
          ${valuation.ownerAggregate?.minPricePerSqFt ?? null},
          ${valuation.ownerAggregate?.medianPricePerSqFt ?? null},
          ${valuation.ownerAggregate?.maxPricePerSqFt ?? null},
          ${JSON.stringify({
            property: {
              society,
              location,
              tower,
              floor,
              bhk,
              areaSqFt,
              areaType,
              carParks,
              purchaseDate,
            },
            costs: {
              purchasePrice,
              stampDuty,
              registrationCost,
              interiors,
              brokerage,
              loanAmount,
              loanTenureYears,
              loanRate,
            },
          })}::jsonb
        )
        ON CONFLICT (contribution_id) DO NOTHING
        RETURNING id, created_at
      ` as Array<{ id: string; created_at: string | Date }>;
      snapshot = createdSnapshots[0];
    }

    return NextResponse.json(
      {
        id: saved.id,
        status: saved.status,
        submittedAt: new Date(saved.submitted_at).toISOString(),
        snapshot: snapshot
          ? {
              id: snapshot.id,
              createdAt: new Date(snapshot.created_at).toISOString(),
            }
          : null,
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
