import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkRefs } from '../check-refs.mjs';

test('clean fixture has no dead refs', async () => {
  assert.deepEqual(await checkRefs('tools/__tests__/fixtures/ok'), []);
});

test('flags a reference to a non-existent lesson', async () => {
  const errors = await checkRefs('tools/__tests__/fixtures/deadref');
  assert.ok(errors.some((e) => /9\.9/.test(e)));
});
