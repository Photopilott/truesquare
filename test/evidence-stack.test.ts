import assert from 'node:assert/strict';
import test from 'node:test';

import {
  EVIDENCE_LABEL_ROW_HEIGHT,
  evidenceAnchors,
  evidenceRowsDoNotOverlap,
} from '../lib/evidence-stack.ts';

test('keeps evidence anchors aligned to their exposed bands', () => {
  assert.deepEqual(evidenceAnchors(), [
    { x: 45, y: 260 },
    { x: 140, y: 305 },
    { x: 247, y: 355 },
    { x: 367, y: 412 },
    { x: 475, y: 475 },
  ]);
});

test('keeps label rows from overlapping', () => {
  assert.equal(evidenceRowsDoNotOverlap(EVIDENCE_LABEL_ROW_HEIGHT), true);
});
