import assert from 'node:assert/strict';
import test from 'node:test';

import {
  isProductEventName,
  isShareSourceScreen,
  safeEventMetadata,
} from '../lib/share-tracking.ts';

test('allows only known share screens and events', () => {
  assert.equal(isShareSourceScreen('owner_result'), true);
  assert.equal(isShareSourceScreen('purchase_price'), false);
  assert.equal(isProductEventName('shared_link_opened'), true);
  assert.equal(isProductEventName('flat_price_added'), false);
});

test('drops personal and unknown analytics metadata', () => {
  assert.deepEqual(
    safeEventMetadata({
      entry: 'whatsapp',
      variant: 'v1',
      purchasePrice: 12_000_000,
      email: 'owner@example.com',
    }),
    { entry: 'whatsapp', variant: 'v1' },
  );
});
