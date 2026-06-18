import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkStructure } from '../check-structure.mjs';

const lax = { minWords: 5, maxWords: 5000 };

test('clean standard lesson passes', async () => {
  assert.deepEqual(await checkStructure('tools/__tests__/fixtures/lean-ok', lax), []);
});

test('flags banned template phrase', async () => {
  const errors = await checkStructure('tools/__tests__/fixtures/banned', lax);
  assert.ok(errors.some((e) => /bannlyst fras/.test(e)));
});

test('flags too-short lesson via word bound', async () => {
  const errors = await checkStructure('tools/__tests__/fixtures/lean-ok', { minWords: 1000, maxWords: 5000 });
  assert.ok(errors.some((e) => /ordlängd/.test(e)));
});
