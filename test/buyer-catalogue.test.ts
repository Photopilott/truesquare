import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildBuyerSocietyCatalogue,
  buyerEvidenceDisplay,
  buyerEvidenceFor,
  type BuyerSocietyEvidenceRow,
} from '../lib/buyer-catalogue-model.ts';

function row(
  overrides: Partial<BuyerSocietyEvidenceRow> = {},
): BuyerSocietyEvidenceRow {
  return {
    catalogue_id: 'inventory:blr_trinity',
    flat_inventory_id: 'blr_trinity',
    society: 'Trinity Acres And Woods',
    location: 'Sarjapur Road',
    builder: null,
    catalogue_source: 'inventory',
    bhk: null,
    is_all_bhks: true,
    registered_count: 0,
    approved_owner_count: 1,
    public_owner_count: 0,
    registered_median_price: null,
    registered_median_price_per_sq_ft: null,
    owner_median_price: null,
    owner_min_price: null,
    owner_max_price: null,
    owner_median_price_per_sq_ft: null,
    owner_min_price_per_sq_ft: null,
    owner_max_price_per_sq_ft: null,
    latest_registered_date: null,
    latest_owner_date: null,
    evidence_source: 'none',
    ...overrides,
  };
}

test('keeps Trinity searchable while one approved owner price stays private', () => {
  const catalogue = buildBuyerSocietyCatalogue([row()], []);
  const trinity = catalogue[0];
  const display = buyerEvidenceDisplay(buyerEvidenceFor(trinity, 'All'));

  assert.equal(trinity.name, 'Trinity Acres And Woods');
  assert.equal(trinity.location, 'Sarjapur Road');
  assert.equal(trinity.hasPermanentPage, false);
  assert.deepEqual(trinity.bhks, []);
  assert.equal(display.approvedOwnerCount, 1);
  assert.equal(display.publicOwnerCount, 0);
  assert.equal(display.medianPrice, null);
  assert.equal(display.label, 'Owner evidence building');
});

test('publishes anonymous owner evidence after the three-record threshold', () => {
  const catalogue = buildBuyerSocietyCatalogue(
    [
      row({
        approved_owner_count: 3,
        public_owner_count: 3,
        owner_median_price: '15200000',
        owner_min_price: '14500000',
        owner_max_price: '16000000',
        owner_median_price_per_sq_ft: '9500',
        owner_min_price_per_sq_ft: '9000',
        owner_max_price_per_sq_ft: '10000',
        latest_owner_date: '2026-08-01',
        evidence_source: 'owner_input',
      }),
      row({
        bhk: '3',
        is_all_bhks: false,
        approved_owner_count: 3,
        public_owner_count: 3,
        owner_median_price: '15200000',
        owner_median_price_per_sq_ft: '9500',
        latest_owner_date: '2026-08-01',
        evidence_source: 'owner_input',
      }),
    ],
    [],
  );
  const trinity = catalogue[0];
  const display = buyerEvidenceDisplay(buyerEvidenceFor(trinity, '3'));

  assert.deepEqual(trinity.bhks, ['3']);
  assert.equal(display.publicOwnerCount, 3);
  assert.equal(display.medianPrice, 15_200_000);
  assert.equal(display.medianPricePerSqFt, 9_500);
  assert.equal(display.label, 'Anonymous owner evidence');
});

test('uses registered evidence as the primary benchmark when both sources exist', () => {
  const catalogue = buildBuyerSocietyCatalogue(
    [
      row({
        registered_count: 4,
        approved_owner_count: 3,
        public_owner_count: 3,
        registered_median_price: '16000000',
        registered_median_price_per_sq_ft: '10000',
        owner_median_price: '15200000',
        owner_median_price_per_sq_ft: '9500',
        latest_registered_date: '2026-08-15',
        latest_owner_date: '2026-08-01',
        evidence_source: 'combined',
      }),
    ],
    [],
  );
  const display = buyerEvidenceDisplay(buyerEvidenceFor(catalogue[0], 'All'));

  assert.equal(display.publicCount, 7);
  assert.equal(display.medianPrice, 16_000_000);
  assert.equal(display.medianPricePerSqFt, 10_000);
  assert.equal(display.latestDate, '2026-08-15');
  assert.equal(display.label, 'Registered + anonymous owner evidence');
});
