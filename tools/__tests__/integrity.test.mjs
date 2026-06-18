import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkIntegrity } from '../check-integrity.mjs';

test('passes a clean fixture', async () => {
  const errors = await checkIntegrity('tools/__tests__/fixtures/ok');
  assert.deepEqual(errors, []);
});

test('flags invalid niva', async () => {
  const errors = await checkIntegrity('tools/__tests__/fixtures/bad-niva');
  assert.ok(errors.some((e) => /niva/.test(e)));
});

test('flags a manifest lesson missing from disk', async () => {
  const errors = await checkIntegrity('tools/__tests__/fixtures/ok', ['1.1', '9.9']);
  assert.ok(errors.some((e) => /9\.9/.test(e) && /saknas/.test(e)));
});

test('flags a disk lesson missing from manifest', async () => {
  const errors = await checkIntegrity('tools/__tests__/fixtures/ok', []);
  assert.ok(errors.some((e) => /1\.1/.test(e) && /manifest/.test(e)));
});
