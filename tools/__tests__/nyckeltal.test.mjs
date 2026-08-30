// Nyckeltalen och harledningarna, provade mot Sanionas verkliga rapportrader.
import test from 'node:test';
import assert from 'node:assert/strict';
import { periodFor, extraheraNyckeltal, harled } from '../../functions/api/_nyckeltal.js';

const ARKIV = [{ namn: 'Saniona AB (publ)', dokument: [
  { url: 'q2', datum: '2026-08-30', rubrik: 'Saniona publicerar delårsrapport för det andra kvartalet 2026',
    bitar: ['Intäkterna uppgick till 4,5 MSEK (9,3) Rörelseresultat uppgick till -60,3 MSEK (-25,9) Likvida medel 486,3 MSEK (308,2)'] },
  { url: 'q1', datum: '2026-08-30', rubrik: 'Saniona publicerar delårsrapport för det första kvartalet 2026',
    bitar: ['Intäkterna uppgick till 4,6 MSEK (9,8) Likvida medel 532,0 MSEK (260,7) Rörelseresultat uppgick till -56,5 MSEK (-16,5)'] },
] }];

test('periodFor laser kvartal och ar ur rubriken', () => {
  assert.deepEqual(periodFor('delårsrapport för det andra kvartalet 2026'), { ar: 2026, kvartal: 2, langd: 1 });
  assert.deepEqual(periodFor('bokslutskommuniké 2025'), { ar: 2025, kvartal: 4, langd: 1 });
  assert.equal(periodFor('Inbjudan till presentation'), null);
});

// Manadsintervall ar det vanligaste sattet svenska bolag rubricerar en rapport,
// och forsta versionen missade dem helt. Langden ar antalet kvartal perioden
// omfattar, vilket avgor vad talet far jamforas med.
test('periodFor laser manadsintervall, med periodens langd', () => {
  assert.deepEqual(periodFor('NYAB AB delårsrapport januari-juni 2026'), { ar: 2026, kvartal: 2, langd: 2 });
  assert.deepEqual(periodFor('Interim Report January-September 2025'), { ar: 2025, kvartal: 3, langd: 3 });
  assert.deepEqual(periodFor('Delårsrapport januari-mars 2026'), { ar: 2026, kvartal: 1, langd: 1 });
});

// MedCap rubricerar rapporten med en rubrik utan period. Da far den las ur
// brodtextens forsta rader i stallet, annars tappas bolaget helt.
test('periodFor faller tillbaka pa brodtexten nar rubriken ar en rubriksattning', () => {
  const p = periodFor('Stark tillväxt; justerad EBITA ökade med 28 %',
    'MedCap AB delårsrapport januari-juni 2026. Koncernens nettoomsättning uppgick till ...');
  assert.deepEqual(p, { ar: 2026, kvartal: 2, langd: 2 });
});

test('tusentalsavgransare med vanligt mellanslag lases som ett tal', () => {
  const arkiv = [{ namn: 'SSAB', dokument: [{ url: 'a', rubrik: 'SSAB: Rapport för andra kvartalet 2026',
    bitar: ['Intäkterna uppgick till 27 489 (25 631) mkr rörelseresultatet uppgick till 2 695 (2 140) mkr'] }] }];
  const tal = extraheraNyckeltal(arkiv);
  const i = tal.find((t) => t.metrik === 'intäkter');
  assert.equal(i.varde, 27489);   // inte 27
  assert.equal(i.enhet, 'MSEK');  // mkr normaliseras
});

test('flodesposter jamfors aldrig mot en annan lang period', () => {
  const arkiv = [{ namn: 'X', dokument: [
    { url: 'h1', rubrik: 'Delårsrapport januari-juni 2026', bitar: ['Intäkterna uppgick till 100,0 MSEK'] },
    { url: 'q1', rubrik: 'Delårsrapport januari-mars 2026', bitar: ['Intäkterna uppgick till 40,0 MSEK'] },
  ] }];
  // Q1 (1 kvartal) mot H1 (2 kvartal) ar inte jamforbara tal.
  assert.equal(harled(extraheraNyckeltal(arkiv)).length, 0);
});

test('balansposter far jamforas over olika langa perioder', () => {
  const arkiv = [{ namn: 'X', dokument: [
    { url: 'h1', rubrik: 'Delårsrapport januari-juni 2026', bitar: ['Likvida medel 400,0 MSEK'] },
    { url: 'q1', rubrik: 'Delårsrapport januari-mars 2026', bitar: ['Likvida medel 460,0 MSEK'] },
  ] }];
  const h = harled(extraheraNyckeltal(arkiv))[0];
  assert.equal(h.forandring, -60);   // saldot 31 mars mot saldot 30 juni
  assert.equal(h.perManad, 20);
});

test('extraheraNyckeltal tar det aktuella talet, inte jamforelsetalet i parentes', () => {
  const tal = extraheraNyckeltal(ARKIV);
  const kassa = tal.filter((n) => n.metrik === 'likvida medel');
  assert.equal(kassa.length, 2);
  assert.equal(kassa[0].varde, 486.3);   // Q2, inte 308,2 som ar samma kvartal forra aret
  assert.equal(kassa[1].varde, 532);
});

test('harled raknar burn rate ur tva pa varandra foljande kvartal', () => {
  const h = harled(extraheraNyckeltal(ARKIV)).find((x) => x.metrik === 'likvida medel');
  assert.equal(h.forandring, -45.7);
  assert.equal(h.perManad, 15.2);        // inte 59, som parentestalet hade gett
  assert.equal(h.fran, 'Q1 2026');
  assert.equal(h.till, 'Q2 2026');
});

test('harled hoppar over perioder som inte foljer pa varandra', () => {
  const glesa = [{ namn: 'X', dokument: [
    { url: 'a', rubrik: 'delårsrapport för det andra kvartalet 2026', bitar: ['Likvida medel 100,0 MSEK'] },
    { url: 'b', rubrik: 'delårsrapport för det andra kvartalet 2025', bitar: ['Likvida medel 300,0 MSEK'] },
  ] }];
  assert.equal(harled(extraheraNyckeltal(glesa)).length, 0);
});

test('en okande kassa far ingen burn rate', () => {
  const vaxande = [{ namn: 'X', dokument: [
    { url: 'a', rubrik: 'delårsrapport för det andra kvartalet 2026', bitar: ['Likvida medel 600,0 MSEK'] },
    { url: 'b', rubrik: 'delårsrapport för det första kvartalet 2026', bitar: ['Likvida medel 500,0 MSEK'] },
  ] }];
  const h = harled(extraheraNyckeltal(vaxande))[0];
  assert.equal(h.forandring, 100);
  assert.equal(h.perManad, undefined);
});

test('runway raknas i kod och bar sitt antagande', () => {
  const h = harled(extraheraNyckeltal(ARKIV)).find((x) => x.metrik === 'likvida medel');
  assert.equal(h.manaderKvar, 32);            // 486,3 / 15,2
  assert.match(h.formel, /OM takten haller i sig/);
});
