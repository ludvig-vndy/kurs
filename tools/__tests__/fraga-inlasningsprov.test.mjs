import { test } from 'node:test';
import assert from 'node:assert/strict';
import { reservation } from '../prova-fraga-inlasning.mjs';
import { Budget } from '../prova-fraga-granskning.mjs';
test('PDF-provet reserverar tokenräkning, marginal och maximal output före betalande anrop', () => {
  const b = new Budget(500000);
  assert.equal(reservation(10000, 4000), 46384);
  assert.equal(reservation(100000, 4000), 140000);
  const t = b.reservera(reservation(300000, 4000));
  assert.ok(t);
  assert.equal(b.reservera(reservation(100000, 4000)), null);
  b.avsluta(t, null);
  assert.equal(b.forbrukat, 380000);
  assert.throws(() => reservation(NaN, 4000));
  assert.throws(() => reservation(1000, 4001));
});
