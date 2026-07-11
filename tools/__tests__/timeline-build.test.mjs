import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildTimeline, invariantState } from '../../motor/vigilans/timeline-build.mjs';

test('invariantState below: intakt/glider/bruten runt tröskeln', () => {
  const inv = { metric: 'gross_margin', op: 'below', value: 40 };
  assert.equal(invariantState(inv, 45), 'intact');   // 45 >= 44
  assert.equal(invariantState(inv, 42), 'drifting');  // 40 <= 42 < 44
  assert.equal(invariantState(inv, 38), 'broken');    // < 40
  assert.equal(invariantState(inv, null), 'intact');  // okänt: ingen falsk risk
});

test('invariantState above: spegelvänt (värdet ska hålla sig under)', () => {
  const inv = { metric: 'net_debt', op: 'above', value: 100 };
  assert.equal(invariantState(inv, 80), 'intact');    // <= 90
  assert.equal(invariantState(inv, 95), 'drifting');  // 90 < 95 <= 100
  assert.equal(invariantState(inv, 120), 'broken');   // > 100
});

const killer = {
  holding: { id: 'h1', name: 'Testbolaget' },
  invariants: [{ metric: 'gross_margin', op: 'below', value: 40 }],
  prices: [
    { d: '2025-01-31', close: 100 },
    { d: '2025-06-30', close: 134 },
    { d: '2025-08-29', close: 138 },
  ],
  figures: [
    { as_of: '2025-03-31', metric: 'gross_margin', value: 43 },
    { as_of: '2025-06-30', metric: 'gross_margin', value: 38 },
  ],
  events: [{ as_of: '2025-06-30', kind: 'tripwire', metric: 'gross_margin', note: 'marginalgolv', observed: 38, threshold: 40, lesson_ids: ['4.4'] }],
  decisions: [{ as_of: '2025-01-31', action: 'Köp' }],
};

test('buildTimeline: bandet brister medan priset står högt (killer-scenariot)', () => {
  const t = buildTimeline(killer);
  // sista bandsegmentet är brutet
  assert.equal(t.band[t.band.length - 1].state, 'broken');
  // och det finns ett glidande segment före
  assert.ok(t.band.some((b) => b.state === 'drifting'));
  // priset är fortfarande högt när tesen brister
  assert.ok(t.domain.max >= 134);
});

test('buildTimeline: markörer får close från kurvan och behåller kurskoppling', () => {
  const t = buildTimeline(killer);
  const tw = t.markers.find((m) => m.kind === 'tripwire');
  assert.equal(tw.close, 134);           // priset på trådens datum
  assert.deepEqual(tw.lesson_ids, ['4.4']);
  assert.ok(t.markers.some((m) => m.kind === 'decision')); // beslut med
});

test('buildTimeline: tomt underlag kraschar inte', () => {
  const t = buildTimeline({});
  assert.deepEqual(t.series, []);
  assert.deepEqual(t.markers, []);
  assert.deepEqual(t.band, []);
});
