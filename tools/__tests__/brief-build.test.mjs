import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildBrief, renderBrief } from '../../motor/vigilans/brief-build.mjs';

const crossed = {
  date: '2026-07-11',
  checked: { reports: 51, filings: 3, insiders: 2 },
  holdings: [{
    id: 'h1', name: 'Testbolaget',
    tripwires: [{ id: 't1', metric: 'gross_margin', op: 'below', value: 40, unit: '%', note: 'marginalgolv' }],
    figures: { gross_margin: { value: 38, period: '2025Q3', source_ref: { title: 'Q3', page: 4 } } },
  }],
};

test('buildBrief: korsad tråd ger status alerts, bolagsnamn och kurskoppling', () => {
  const b = buildBrief(crossed);
  assert.equal(b.status, 'alerts');
  assert.equal(b.alerts.length, 1);
  const a = b.alerts[0];
  assert.equal(a.holding_name, 'Testbolaget');
  assert.equal(a.observed, 38);
  assert.deepEqual(a.lesson_ids, ['4.4', '5.1']); // gross_margin -> lektioner
});

test('buildBrief: inga korsningar ger tyst morgon', () => {
  const b = buildBrief({
    checked: { reports: 10, filings: 0, insiders: 1 },
    holdings: [{
      id: 'h1', name: 'Lugnt',
      tripwires: [{ metric: 'gross_margin', op: 'below', value: 25 }],
      figures: { gross_margin: { value: 31 } },
    }],
  });
  assert.equal(b.status, 'silent');
  assert.equal(b.alerts.length, 0);
});

test('renderBrief: larm visar källa och lektionspekare', () => {
  const out = renderBrief(buildBrief(crossed), (id) => (id === '4.4' ? 'Vinstkvalitet' : id));
  assert.match(out, /Testbolaget/);
  assert.match(out, /38 % under din gräns 40 %/);
  assert.match(out, /Källa: Q3, sid 4/);
  assert.match(out, /Läs: 4\.4 Vinstkvalitet/);
});

test('renderBrief: tyst morgon säger ifrån och visar kvittologgen', () => {
  const out = renderBrief({ date: '2026-07-11', status: 'silent', alerts: [], checked: { reports: 40, filings: 1, insiders: 0 } });
  assert.match(out, /Inga trådar korsade/);
  assert.match(out, /Vi läste 40 rapporter/);
});
