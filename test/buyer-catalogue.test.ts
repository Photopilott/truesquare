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
    public_owner_count: 1,
    registered_median_price: null,
    registered_median_price_per_sq_ft: null,
    owner_median_price: '15200000',
    owner_min_price: '15200000',
    owner_max_price: '15200000',
    owner_median_price_per_sq_ft: '9500',
    owner_min_price_per_sq_ft: '9500',
    owner_max_price_per_sq_ft: '9500',
    latest_registered_date: null,
    latest_owner_date: '2026-08-01',
    evidence_source: 'owner_input',
    ...overrides,
  };
}

test('publishes Trinity after one owner price is approved', () => {
  const catalogue = buildBuyerSocietyCatalogue(
    [
      row(),
      row({
        bhk: '3',
        is_all_bhks: false,
      }),
    ],
    [],
  );
  const trinity = catalogue[0];
  const display = buyerEvidenceDisplay(buyerEvidenceFor(trinity, 'All'));

  assert.equal(trinity.name, 'Trinity Acres And Woods');
  assert.equal(trinity.location, 'Sarjapur Road');
  assert.equal(trinity.hasPermanentPage, true);
  assert.deepEqual(trinity.bhks, ['3']);
  assert.equal(display.approvedOwnerCount, 1);
  assert.equal(display.publicOwnerCount, 1);
  assert.equal(display.medianPrice, 15_200_000);
  assert.equal(display.medianPricePerSqFt, 9_500);
  assert.equal(display.label, 'Admin-approved owner evidence');

  const publicFields = trinity as unknown as Record<string, unknown>;
  for (const privateField of [
    'contributorId',
    'userId',
    'email',
    'ownerInputTransactionId',
    'floor',
    'loanAmount',
  ]) {
    assert.equal(privateField in publicFields, false);
  }
});

test('merges one society split between its inventory area and workbook micro-market', () => {
  const catalogue = buildBuyerSocietyCatalogue(
    [
      row({
        catalogue_id: 'inventory:blr_prestige_ferns',
        flat_inventory_id: 'blr_prestige_ferns',
        society: 'Prestige Ferns Residency',
        location: 'Harlur',
        registered_count: 0,
        approved_owner_count: 3,
        public_owner_count: 3,
        owner_median_price: '18000000',
        owner_median_price_per_sq_ft: '15038',
        latest_owner_date: '2025-09-01',
        evidence_source: 'owner_input',
      }),
      row({
        catalogue_id: 'final:legacy-prestige-ferns',
        flat_inventory_id: null,
        society: 'Prestige Ferns Residency',
        location: 'Sarjapur Road',
        catalogue_source: 'final_value',
        registered_count: 1,
        approved_owner_count: 0,
        public_owner_count: 0,
        registered_median_price: '17200000',
        registered_median_price_per_sq_ft: '14369',
        owner_median_price: null,
        owner_min_price: null,
        owner_max_price: null,
        owner_median_price_per_sq_ft: null,
        owner_min_price_per_sq_ft: null,
        owner_max_price_per_sq_ft: null,
        latest_registered_date: '2024-11-12',
        latest_owner_date: null,
        evidence_source: 'registered_transaction',
      }),
    ],
    [],
  );

  assert.equal(catalogue.length, 1);
  assert.equal(catalogue[0].name, 'Prestige Ferns Residency');
  assert.equal(catalogue[0].location, 'Harlur');
  assert.equal(catalogue[0].flatInventoryId, 'blr_prestige_ferns');
  const display = buyerEvidenceDisplay(buyerEvidenceFor(catalogue[0], 'All'));
  assert.equal(display.registeredCount, 1);
  assert.equal(display.publicOwnerCount, 3);
  assert.equal(display.publicCount, 4);
  assert.equal(display.label, 'Registered + approved owner evidence');
});

test('merges a workbook society whose name adds a trailing Apartment label', () => {
  const catalogue = buildBuyerSocietyCatalogue(
    [
      row({
        catalogue_id: 'inventory:blr_shriram_chirping_woods',
        flat_inventory_id: 'blr_shriram_chirping_woods',
        society: 'Shriram Chirping Woods',
        location: 'Harlur',
        approved_owner_count: 0,
        public_owner_count: 0,
        owner_median_price: null,
        owner_min_price: null,
        owner_max_price: null,
        owner_median_price_per_sq_ft: null,
        owner_min_price_per_sq_ft: null,
        owner_max_price_per_sq_ft: null,
        latest_owner_date: null,
        evidence_source: 'none',
      }),
      row({
        catalogue_id: 'final:legacy-shriram-chirping-woods',
        flat_inventory_id: null,
        society: 'Shriram Chirping Woods Apartment',
        location: 'Haralur',
        catalogue_source: 'final_value',
        registered_count: 5,
        approved_owner_count: 0,
        public_owner_count: 0,
        registered_median_price: '17500000',
        registered_median_price_per_sq_ft: '12551',
        owner_median_price: null,
        owner_min_price: null,
        owner_max_price: null,
        owner_median_price_per_sq_ft: null,
        owner_min_price_per_sq_ft: null,
        owner_max_price_per_sq_ft: null,
        latest_registered_date: '2025-07-08',
        latest_owner_date: null,
        evidence_source: 'registered_transaction',
      }),
    ],
    [
      {
        slug: 'shriram-chirping-woods-apartment',
        name: 'Shriram Chirping Woods Apartment',
        location: 'Haralur',
        bhks: ['1', '2', '3'],
        towers: ['1', '2', '11', '17'],
        transactionCount: 5,
        medianPrice: 17_500_000,
        medianPricePerSqFt: 12_551,
        latestTransactionDate: '2025-07-08',
      },
    ],
  );

  assert.equal(catalogue.length, 1);
  assert.equal(catalogue[0].name, 'Shriram Chirping Woods');
  assert.equal(catalogue[0].location, 'Harlur');
  assert.equal(catalogue[0].flatInventoryId, 'blr_shriram_chirping_woods');
  assert.equal(catalogue[0].slug, 'shriram-chirping-woods');
  const display = buyerEvidenceDisplay(buyerEvidenceFor(catalogue[0], 'All'));
  assert.equal(display.registeredCount, 5);
  assert.equal(display.publicCount, 5);
});

test('publishes the approved owner range when several records exist', () => {
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
  assert.equal(display.label, 'Admin-approved owner evidence');
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
  assert.equal(display.label, 'Registered + approved owner evidence');
});
