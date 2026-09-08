import test from 'node:test';
import assert from 'node:assert/strict';
import { extraheraNyckeltal, harled } from '../../functions/api/_nyckeltal.js';

const arkiv = [{ id: 'alfa', namn: 'Exempelbolag Alfa', dokument: [{
  rubrik: 'Q2 2026', datum: '2026-08-01', url: 'https://example.test/alfa/q2',
  bitar: ['Rörelseresultatet uppgick till -85 MSEK. Nettoomsättningen uppgick till 100 MSEK.'],
}] }];

test('extraktionen bevarar identitet, tecken och exakt kallstalle', () => {
  const n = extraheraNyckeltal(arkiv).find(n => n.metrik === 'rörelseresultat');
  assert.equal(n.bolagId, 'alfa');
  assert.equal(n.original.varde, -85);
  assert.equal(n.original.enhet, 'MSEK');
  assert.equal(n.kalla.url, 'https://example.test/alfa/q2');
  assert.equal(n.kalla.citat.slice(n.kalla.start, n.kalla.slut), 'Rörelseresultatet uppgick till -85 MSEK');
});

test('berakningen behaller indata sa siffran kan foljas hela vagen till rapporten', () => {
  const h = harled(extraheraNyckeltal(arkiv)).find(h => h.sort === 'kvot');
  assert.equal(h.procent, -85);
  assert.equal(h.indata[0].metrik, 'rörelseresultat');
  assert.equal(h.indata[1].metrik, 'intäkter');
  assert.equal(h.indata[0].bolagId, 'alfa');
  assert.equal(h.indata[1].kalla.url, 'https://example.test/alfa/q2');
});

test('samma visningsnamn far inte sla ihop olika bolags-id', () => {
  const beta = structuredClone(arkiv[0]);
  beta.id = 'beta';
  beta.dokument[0].bitar = ['Nettoomsättningen uppgick till 900 MSEK.'];
  const tal = extraheraNyckeltal([...arkiv, beta]);
  assert.equal(tal.filter(n => n.metrik === 'intäkter').length, 2);
  assert.equal(harled(tal).filter(n => n.sort === 'kvot').length, 1);
  assert.equal(harled(tal)[0].procent, -85);
});

test('PDF-fakta hamtar citat och sida ur arkivets separata kallor', () => {
  const a = structuredClone(arkiv);
  a[0].dokument[0].fakta = { kassa: { nu: 777, enhet: 'KSEK' } };
  a[0].dokument[0].kallor = { kassa: { citat: 'Likvida medel 777 KSEK', sida: 10 } };
  const n = extraheraNyckeltal(a).find(n => n.metrik === 'likvida medel');
  assert.equal(n.kalla.citat, 'Likvida medel 777 KSEK');
  assert.equal(n.kalla.sida, 10);
});

test('matematiskt minustecken i rapporttext blir inte ett positivt faktavarde', () => {
  const a = structuredClone(arkiv);
  a[0].dokument[0].bitar = ['Rörelseresultatet uppgick till −85 MSEK.'];
  const n = extraheraNyckeltal(a).find(n => n.metrik === 'rörelseresultat');
  assert.equal(n.varde, -85);
  assert.equal(n.original.varde, -85);
});
