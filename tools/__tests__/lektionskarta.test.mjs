import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
  METRIC_TILL_LEKTION,
  lektionerForMetric,
  handlingForLektion,
  allaLektionsIder,
} from '../../motor/vigilans/lektionskarta.mjs';

// Bygg mängden giltiga lektions-id ur den faktiska kursen.
function giltigaLektionsIder() {
  const url = new URL('../../content/fundamental-aktieanalys/course.json', import.meta.url);
  const j = JSON.parse(readFileSync(fileURLToPath(url), 'utf8'));
  const set = new Set();
  for (const k of j.kapitel || []) {
    for (const l of k.lektioner || []) set.add(String(l.lektion));
  }
  return set;
}

test('varje mappat lektions-id finns faktiskt i kursen (ingen drift)', () => {
  const giltiga = giltigaLektionsIder();
  const saknade = allaLektionsIder().filter((id) => !giltiga.has(id));
  assert.deepEqual(saknade, [], 'lektions-id utan motsvarighet i course.json: ' + saknade.join(', '));
});

test('riktning 1: metrik -> lektion pekar primärt rätt', () => {
  assert.equal(lektionerForMetric('dilution')[0], '17.3');   // kallelsen och utspädningen
  assert.equal(lektionerForMetric('cash_runway')[0], '12.5'); // kassa, burn och finansieringsrisk
  assert.deepEqual(lektionerForMetric('okänd_metrik'), []);
});

test('riktning 2: lektion -> handling ger tråd-mall eller checklista', () => {
  const h = handlingForLektion('17.3');
  assert.ok(h);
  assert.equal(h.typ, 'trad');
  assert.equal(h.metric, 'dilution');
  assert.equal(handlingForLektion('0.1'), null); // inte varje lektion har en handling
});

test('varje metrik har minst en lektion', () => {
  for (const [metric, ids] of Object.entries(METRIC_TILL_LEKTION)) {
    assert.ok(ids.length >= 1, metric + ' saknar lektion');
  }
});
