import assert from 'node:assert/strict';
import test from 'node:test';

import {
  formatAcres,
  sortFilingsByStartDate,
  sqmToAcres,
  type Filing,
} from '../lib/atlas-model.ts';

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

test('sorts projects by start date with missing dates last', () => {
  const filing = (id: number, name: string, start: string | null) =>
    ({ id, name, start }) as Filing;
  const projects = [
    filing(1, 'Middle', '2020-06-01'),
    filing(2, 'Missing', null),
    filing(3, 'Newest', '2024-01-15'),
    filing(4, 'Oldest', '2014-03-01'),
  ];

  assert.deepEqual(
    sortFilingsByStartDate(projects, 'latest').map((item) => item.name),
    ['Newest', 'Middle', 'Oldest', 'Missing'],
  );
  assert.deepEqual(
    sortFilingsByStartDate(projects, 'oldest').map((item) => item.name),
    ['Oldest', 'Middle', 'Newest', 'Missing'],
  );
  assert.equal(projects[0].name, 'Middle');
});
