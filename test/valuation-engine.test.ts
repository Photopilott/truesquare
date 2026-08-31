import assert from 'node:assert/strict';
import test from 'node:test';

import { calculateValuation } from '../lib/valuation-engine.ts';

const records = [
  {
    id: 'exact-2bhk',
    location: 'Bellandur',
    society: 'Example Heights',
    tower: 'A',
    bhk: '2',
    registrationDate: '2025-01-10',
    rawDate: '10 Jan 2025',
    price: 12_000_000,
    effectiveArea: 1_200,
    pricePerSqFt: 10_000,
    areaBasis: 'Super built-up',
    saleType: 'Resale',
    qaNotes: null,
    sourceFile: 'one.pdf',
    sourceUrl: 'https://example.com/one',
  },
  {
    id: 'same-society-3bhk',
    location: 'Bellandur',
    society: 'Example Heights',
    tower: 'A',
    bhk: '3',
    registrationDate: '2025-02-10',
    rawDate: '10 Feb 2025',
    price: 18_000_000,
    effectiveArea: 1_500,
    pricePerSqFt: 12_000,
    areaBasis: 'Super built-up',
    saleType: 'Resale',
    qaNotes: null,
    sourceFile: 'two.pdf',
    sourceUrl: 'https://example.com/two',
  },
];

const input = {
  society: 'Example Heights',
  location: 'Bellandur',
  bhk: '2',
  areaSqFt: 1_200,
  purchaseDate: '2020-01-01',
  purchasePrice: 8_000_000,
  stampDuty: 0,
  registrationCost: 0,
  interiors: 0,
  brokerage: 0,
  loanAmount: null,
  loanTenureYears: null,
  loanRate: null,
};

test('uses exact-society and exact-BHK evidence first', () => {
  const result = calculateValuation(input, records, []);
  assert.equal(result.matchTier, 'exact-society-bhk');
  assert.deepEqual(result.comparables.map((record) => record.id), ['exact-2bhk']);
  assert.equal(result.estimate, 12_000_000);
  assert.equal(result.confidence, 'Low');
});

test('falls back to the same society before the wider micro-market', () => {
  const result = calculateValuation({ ...input, bhk: '4' }, records, []);
  assert.equal(result.matchTier, 'same-society-any-bhk');
  assert.equal(result.comparables.length, 2);
});

test('keeps owner evidence separate from registered transaction confidence', () => {
  const result = calculateValuation(input, records, [
    {
      society: 'Example Heights',
      location: 'Bellandur',
      bhk: '2',
      approvedCount: 3,
      minPricePerSqFt: 9_500,
      medianPricePerSqFt: 10_200,
      maxPricePerSqFt: 10_700,
      updatedAt: '2026-01-01T00:00:00.000Z',
    },
  ]);
  assert.equal(result.comparables.length, 1);
  assert.equal(result.confidence, 'Low');
  assert.equal(result.ownerAggregate?.approvedCount, 3);
  assert.equal(result.estimate, 12_000_000);
});
