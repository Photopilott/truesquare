import assert from 'node:assert/strict';
import test from 'node:test';

import { parseDeveloperInterest } from '../lib/developer-interest.ts';

test('accepts a buyer report request', () => {
  const result = parseDeveloperInterest({
    audience: 'buyer',
    developer: '  Example Homes  ',
    project: 'Example Park',
    buyingStage: 'Comparing a shortlist',
    email: 'BUYER@EXAMPLE.COM',
    emailOptIn: true,
  });

  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.data.developer, 'Example Homes');
  assert.equal(result.data.email, 'buyer@example.com');
  assert.equal(result.data.relationship, null);
});

test('requires an owner project and valid relationship', () => {
  const result = parseDeveloperInterest({
    audience: 'owner',
    developer: 'Example Homes',
    project: '',
    relationship: 'Current owner',
    email: 'owner@example.com',
    emailOptIn: true,
  });

  assert.deepEqual(result, {
    ok: false,
    error: 'Enter your project or society.',
  });
});

test('requires email permission', () => {
  const result = parseDeveloperInterest({
    audience: 'buyer',
    developer: 'Example Homes',
    buyingStage: 'Just researching',
    email: 'buyer@example.com',
    emailOptIn: false,
  });

  assert.deepEqual(result, {
    ok: false,
    error: 'Confirm that FlatData may email you about this report.',
  });
});
