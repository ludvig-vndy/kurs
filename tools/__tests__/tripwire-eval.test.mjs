import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  evaluateTripwire,
  evaluateHolding,
  buildBriefPayload,
} from '../../motor/vigilans/tripwire-eval.mjs';

test('below: larmar när observerad ligger under tröskeln', () => {
  const tw = { metric: 'gross_margin', op: 'below', value: 40, unit: '%' };
  const ev = evaluateTripwire(tw, { value: 38, period: '2025Q3', source_ref: { page: 4 } });
  assert.ok(ev);
  assert.equal(ev.observed, 38);
  assert.equal(ev.threshold, 40);
  assert.deepEqual(ev.source_ref, { page: 4 });
});

test('below: tyst när observerad är på/över tröskeln', () => {
  const tw = { metric: 'gross_margin', op: 'below', value: 40 };
  assert.equal(evaluateTripwire(tw, { value: 40 }), null);
  assert.equal(evaluateTripwire(tw, { value: 41 }), null);
});

test('above: larmar när observerad överstiger tröskeln', () => {
  const tw = { metric: 'insider_sell', op: 'above', value: 500000 };
  assert.ok(evaluateTripwire(tw, { value: 500001 }));
  assert.equal(evaluateTripwire(tw, { value: 500000 }), null);
});

test('crosses: larmar bara på själva korsningen, kräver två punkter', () => {
  const tw = { metric: 'gross_margin', op: 'crosses', value: 40 };
  // föregående över, nu under -> korsning
  assert.ok(evaluateTripwire(tw, { value: 39 }, { value: 41 }));
  // föregående under, nu över -> korsning åt andra hållet
  assert.ok(evaluateTripwire(tw, { value: 41 }, { value: 39 }));
  // båda under -> ingen korsning (larmar inte varje period den ligger under)
  assert.equal(evaluateTripwire(tw, { value: 38 }, { value: 39 }), null);
  // ingen föregående punkt -> kan inte avgöra korsning
  assert.equal(evaluateTripwire(tw, { value: 38 }), null);
});

test('mutad tråd larmar aldrig', () => {
  const tw = { metric: 'gross_margin', op: 'below', value: 40, status: 'muted' };
  assert.equal(evaluateTripwire(tw, { value: 10 }), null);
});

test('saknad eller icke-numerisk data ger inget larm', () => {
  const tw = { metric: 'gross_margin', op: 'below', value: 40 };
  assert.equal(evaluateTripwire(tw, null), null);
  assert.equal(evaluateTripwire(tw, { value: null }), null);
  assert.equal(evaluateTripwire(tw, { value: 'x' }), null);
});

test('evaluateHolding sorterar hårdaste avvikelsen först (risk-först)', () => {
  const tripwires = [
    { metric: 'gross_margin', op: 'below', value: 40 }, // 39 -> 2.5% under
    { metric: 'net_debt', op: 'above', value: 100 },    // 200 -> 100% över
  ];
  const figures = {
    gross_margin: { value: 39 },
    net_debt: { value: 200 },
  };
  const events = evaluateHolding(tripwires, figures);
  assert.equal(events.length, 2);
  assert.equal(events[0].metric, 'net_debt'); // störst relativ avvikelse först
});

test('buildBriefPayload: inga händelser -> tyst morgon med kvittolog', () => {
  const p = buildBriefPayload({}, { reports: 51, filings: 3, insiders: 2 });
  assert.equal(p.status, 'silent');
  assert.equal(p.alerts.length, 0);
  assert.equal(p.checked.reports, 51);
});

test('buildBriefPayload: händelser -> status alerts, risk-först över innehav', () => {
  const p = buildBriefPayload({
    h1: [{ metric: 'gross_margin', threshold: 40, observed: 39 }],
    h2: [{ metric: 'net_debt', threshold: 100, observed: 300 }],
  });
  assert.equal(p.status, 'alerts');
  assert.equal(p.alerts[0].holding_id, 'h2'); // hårdaste först
});
