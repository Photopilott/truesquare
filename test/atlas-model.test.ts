import assert from 'node:assert/strict';
import test from 'node:test';

import { formatAcres, sqmToAcres } from '../lib/atlas-model.ts';

test('converts square metres to acres using the international acre', () => {
  assert.equal(sqmToAcres(1_978), 0.4888);
  assert.equal(sqmToAcres(4_046.8564224), 1);
  assert.equal(sqmToAcres(null), null);
});

test('formats acres for a compact, readable display', () => {
  assert.equal(formatAcres(0.4888), '0.49');
  assert.equal(formatAcres(12.3456), '12.35');
  assert.equal(formatAcres(null), 'not filed');
});
