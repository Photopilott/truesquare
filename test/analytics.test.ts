import assert from 'node:assert/strict';
import test from 'node:test';

import {
  analyticsModule,
  safeAnalyticsPageLocation,
  sanitizeAnalyticsParams,
} from '../lib/analytics.ts';

test('analytics parameters keep only the approved non-private contract', () => {
  assert.deepEqual(
    sanitizeAnalyticsParams({
      page_path: '/owner',
      context: 'owner',
      error_count: 2,
      is_referral: true,
      email: 'private@example.com',
      purchase_price: 12_500_000,
      tower: 'Private tower',
    }),
    {
      page_path: '/owner',
      context: 'owner',
      error_count: 2,
      is_referral: true,
    },
  );
});

test('analytics strings are capped and non-finite numbers are removed', () => {
  const result = sanitizeAnalyticsParams({
    button_id: 'a'.repeat(150),
    error_count: Number.NaN,
  });
  assert.equal(result.button_id, 'a'.repeat(100));
  assert.equal('error_count' in result, false);
});

test('page paths map to stable product modules', () => {
  assert.equal(analyticsModule('/'), 'home');
  assert.equal(analyticsModule('/owner'), 'owner');
  assert.equal(analyticsModule('/societies/example'), 'society');
  assert.equal(analyticsModule('/atlas/projects/example'), 'atlas_project');
});

test('page locations keep safe campaign tags and remove private query values', () => {
  assert.equal(
    safeAnalyticsPageLocation(
      'https://flatdata.in/owner?ref=private-id&authError=private&utm_source=WhatsApp&utm_medium=messaging&utm_campaign=john@example.com&utm_content=9876543210',
    ),
    'https://flatdata.in/owner?utm_source=whatsapp&utm_medium=messaging',
  );
});
