import assert from 'node:assert/strict';
import test from 'node:test';

import { prepareTransactionImport } from '../lib/transaction-import.ts';

const baseRow = {
  'Record ID': 'TXN-1000',
  Location: 'Bellandur',
  Society: 'Example Heights',
  'Property Type': 'Apartment',
  BHK: 2,
  'Event Type': 'Sale',
  'Registration Date': 45744,
  'Raw Registration Date': '28 Mar 2025',
  'Price / Amount (INR)': 12_000_000,
  'Effective Area for PPSF': 1_200,
  'Effective Price/sq ft (INR)': 10_000,
  'PPSF Area Basis': 'Super built-up',
  'Source File': 'example.pdf',
  'Zapkey URL': 'https://www.zapkey.com/details/example',
};

test('marks a complete launch-area apartment sale ready for publication', () => {
  const prepared = prepareTransactionImport([baseRow]);
  assert.equal(prepared.readyCount, 1);
  assert.equal(prepared.rows[0].qaStatus, 'ready');
  assert.equal(prepared.rows[0].registrationDate, '2025-03-28');
  assert.equal(prepared.rows[0].location, 'Bellandur');
});

test('keeps incomplete sale data in review and out of publication', () => {
  const prepared = prepareTransactionImport([
    {
      ...baseRow,
      'Record ID': 'TXN-1001',
      'Zapkey URL': 'https://www.zapkey.com/details/review',
      'Registration Date': null,
    },
  ]);
  assert.equal(prepared.reviewCount, 1);
  assert.equal(prepared.rows[0].qaStatus, 'needs_review');
  assert.deepEqual(prepared.rows[0].qaReasons, [
    'Missing or invalid registration date',
  ]);
});

test('rejects mortgage, non-flat and out-of-area rows', () => {
  const prepared = prepareTransactionImport([
    {
      ...baseRow,
      'Record ID': 'TXN-1002',
      'Zapkey URL': 'https://www.zapkey.com/details/mortgage',
      'Event Type': 'Mortgage',
    },
    {
      ...baseRow,
      'Record ID': 'TXN-1003',
      'Zapkey URL': 'https://www.zapkey.com/details/villa',
      'Property Type': 'Villa',
    },
    {
      ...baseRow,
      'Record ID': 'TXN-1004',
      'Zapkey URL': 'https://www.zapkey.com/details/outside',
      Location: 'Whitefield',
    },
  ]);
  assert.equal(prepared.rejectedCount, 3);
  assert.ok(
    prepared.rows[0].qaReasons.includes('Not a sale transaction'),
  );
  assert.ok(prepared.rows[1].qaReasons.includes('Not an apartment record'));
  assert.ok(
    prepared.rows[2].qaReasons.includes('Outside the current launch areas'),
  );
});

test('rejects duplicate source records before they can affect a valuation', () => {
  const prepared = prepareTransactionImport([
    baseRow,
    { ...baseRow, 'Registration Date': 45745 },
  ]);
  assert.equal(prepared.readyCount, 1);
  assert.equal(prepared.rejectedCount, 1);
  assert.ok(
    prepared.rows[1].qaReasons.includes('Duplicate record ID in this upload'),
  );
  assert.ok(
    prepared.rows[1].qaReasons.includes('Duplicate source URL in this upload'),
  );
});
