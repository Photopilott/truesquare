import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildPublicSocietyEvidence,
  societyShareMessage,
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
  assert.equal(evidence.publicOwnerContributionCount, 3);
});

test('share copy discloses only the society benchmark', () => {
  const evidence = buildPublicSocietyEvidence(
    society,
    [record('one', 15_000_000, 10_000, '2026-01-01')],
    [],
  );
  const message = societyShareMessage(evidence);

  assert.match(message, /Test Society/);
  assert.match(message, /my flat price is not disclosed/i);
  assert.doesNotMatch(message, /tower|floor|email|return/i);
});
