import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildPublicSocietyEvidence,
  societyShareMessage,
  societyWhatsAppText,
  type SocietySummary,
} from '../lib/society-evidence.ts';
import type { OwnerPriceAggregate } from '../lib/owner-aggregates.ts';
import type { TransactionRecord } from '../lib/valuation-engine.ts';

const society: SocietySummary = {
  slug: 'test-society',
  name: 'Test Society',
  location: 'Bellandur',
  bhks: ['2'],
  towers: ['A'],
  transactionCount: 2,
  medianPrice: 15_000_000,
  medianPricePerSqFt: 10_000,
  latestTransactionDate: '2026-01-01',
};

function record(
  id: string,
  price: number,
  pricePerSqFt: number,
  registrationDate: string | null,
): TransactionRecord {
  return {
    id,
    society: society.name,
    location: society.location,
    tower: 'A',
    bhk: '2',
    registrationDate,
    rawDate: registrationDate ?? 'invalid',
    price,
    effectiveArea: 1500,
    pricePerSqFt,
    areaBasis: 'Super built-up',
    saleType: 'Sale',
    qaNotes: null,
    sourceFile: 'test.pdf',
    sourceUrl: 'https://example.com/source',
  };
}

test('builds one public society benchmark from eligible evidence', () => {
  const ownerAggregates: OwnerPriceAggregate[] = [
    {
      society: society.name,
      location: society.location,
      bhk: '2',
      approvedCount: 3,
      minPricePerSqFt: 9000,
      medianPricePerSqFt: 9500,
      maxPricePerSqFt: 10_000,
      updatedAt: '2026-08-01T00:00:00.000Z',
    },
  ];
  const evidence = buildPublicSocietyEvidence(
    society,
    [
      record('one', 15_000_000, 10_000, '2026-01-01'),
      record('two', 18_000_000, 12_000, '2026-02-01'),
      record('old', 9_000_000, 6_000, '2024-12-01'),
      record('invalid', 99_000_000, 99_000, null),
      { ...record('other', 10_000_000, 7000, '2026-03-01'), society: 'Other' },
    ],
    ownerAggregates,
  );

  assert.equal(evidence.registeredCount, 2);
  assert.equal(evidence.registeredMedianPrice, 16_500_000);
  assert.equal(evidence.registeredMedianPricePerSqFt, 11_000);
  assert.equal(evidence.confidence, 'Low');
  assert.equal(evidence.latestEvidenceDate, '2026-02-01');
  assert.equal(evidence.evidenceWindowStart, '2025-02-01');
  assert.equal(evidence.evidenceWindowEnd, '2026-02-01');
  assert.equal(evidence.latestRegisteredPrice, 18_000_000);
  assert.equal(evidence.latestRegisteredPricePerSqFt, 12_000);
  assert.equal(evidence.registeredRecords.length, 3);
  assert.equal(evidence.publicOwnerContributionCount, 3);
});

test('uses the approved three-line WhatsApp copy', () => {
  const evidence = buildPublicSocietyEvidence(
    society,
    [record('one', 15_000_000, 10_000, '2026-01-01')],
    [],
  );
  const message = societyShareMessage(evidence);

  assert.equal(
    message,
    "Found a site that shows what your flat is worth today and how much it's gone up since you bought it. Uses actual registration data, not broker listings.\nTest Society is at ₹10,000/sq ft right now.",
  );
  assert.doesNotMatch(message, /tower|floor|email/i);
  assert.equal(
    societyWhatsAppText(evidence, 'https://www.flatdata.in/societies/test'),
    "Found a site that shows what your flat is worth today and how much it's gone up since you bought it. Uses actual registration data, not broker listings.\nTest Society is at ₹10,000/sq ft right now.\nhttps://www.flatdata.in/societies/test",
  );
});

test('shares the latest registered square-foot price, not the median', () => {
  const evidence = buildPublicSocietyEvidence(
    society,
    [
      record('one', 15_000_000, 10_000, '2026-01-01'),
      record('two', 18_000_000, 12_000, '2026-02-01'),
      record('three', 16_500_000, 11_000, '2026-01-15'),
    ],
    [],
  );

  assert.match(
    societyShareMessage(evidence),
    /Test Society is at ₹12,000\/sq ft right now\./,
  );
});
