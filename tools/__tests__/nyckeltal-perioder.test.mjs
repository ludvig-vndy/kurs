import test from 'node:test';
import assert from 'node:assert/strict';
import { extraheraNyckeltal, periodFor, periodUrSpann } from '../../functions/api/_nyckeltal.js';
import { skapaFaktaregister } from '../../functions/api/_faktaregister.js';

const arkiv = (text, rubrik = 'Delårsrapport juli 2021 - juni 2022') => [{
  id: 'unibap', namn: 'Unibap', dokument: [{ rubrik, datum: '2022-08-25',
    url: 'https://example.com/rapport', bitar: [text] }],
}];
const intakt = n => `Nettoomsättningen uppgick till ${n} KSEK (4 268).`;

test('brutet och förlängt räkenskapsår har explicit slutår och längd', () => {
  assert.deepEqual(periodUrSpann('juli 2021 - juni 2022'), { ar: 2022, kvartal: 2, langd: 4 });
  assert.deepEqual(periodFor('Rapport juli 2021 - december 2022'), { ar: 2022, kvartal: 4, langd: 6 });
  assert.equal(periodUrSpann('juli - juni 2022'), null);
  assert.equal(periodUrSpann('juli 2023 - juni 2022'), null);
});

test('Unibaps rapport ger kvartal och räkenskapsår som separata värden', () => {
  const text = 'Delårsrapport juli 2021 - juni 2022 Publicerad 2022-08-25. ' +
    'April - juni 2022 ' + intakt('6 969') +
    ' Juli 2021 - juni 2022 ' + intakt('23 412');
  const poster = extraheraNyckeltal(arkiv(text));
  assert.deepEqual(poster.map(p => [p.ar, p.kvartal, p.langd, p.varde]),
    [[2022, 2, 1, 6.969], [2022, 2, 4, 23.412]]);
  for (const p of poster) {
    assert.equal(p.bolagId, 'unibap');
    assert.equal(p.kalla.citat.slice(p.kalla.start, p.kalla.slut), intakt(p.original.varde.toLocaleString('sv-SE').replaceAll('\u00a0', ' ')).split(' (')[0]);
  }
});

test('flera kvartal läses även när dokumentets rubrik saknar giltig period', () => {
  const poster = extraheraNyckeltal(arkiv('Q2 2022 ' + intakt('6 969') + ' Q3 2022 ' + intakt('7 000'), 'Rapport för förlängt räkenskapsår'));
  assert.deepEqual(poster.map(p => [p.kvartal, p.varde]), [[3, 7], [2, 6.969]]);
});

test('närmaste rubrik gäller även när avsnittet är längre än 400 tecken', () => {
  const poster = extraheraNyckeltal(arkiv('April-juni 2022 ' + 'Kommentar. '.repeat(60) + intakt('6 969')));
  assert.deepEqual(poster.map(p => [p.kvartal, p.langd]), [[2, 1]]);
});

test('oklara lokala perioder lånar aldrig år eller period från rubriken', () => {
  for (const lokal of ['Februari-juni 2022', 'April-juni', 'Juli-juni 2022', 'Q5 2022', 'Q2', 'Andra halvåret 2022']) {
    assert.deepEqual(extraheraNyckeltal(arkiv(lokal + ' ' + intakt('6 969'), 'Q4 2022')), [], lokal);
  }
  assert.equal(periodFor('Publicerad 2026-02-25: Q4'), null);
  assert.equal(periodFor('Publicerad 2026-02-25: Q4 2025')?.ar, 2025);
});

test('parentetiska jämförelseperioder och värden blir inte nya operander', () => {
  const poster = extraheraNyckeltal(arkiv('April-juni 2022 (April-juni 2021) ' + intakt('6 969') +
    ' (April-juni 2021 ' + intakt('4 268') + ')'));
  assert.deepEqual(poster.map(p => [p.ar, p.varde]), [[2022, 6.969]]);
});

test('tvetydiga årtal och datumspann är avsnittsgränser, inte titelns kvartal', () => {
  for (const lokal of ['Q2 2021/2022', 'April-juni 2021/2022', '2022-02-01 – 2022-06-30', 'Kvartal 5 2022']) {
    assert.deepEqual(extraheraNyckeltal(arkiv(lokal + ' ' + intakt('6 969'), 'Q4 2022')), [], lokal);
  }
});

test('periodomnämnande i löptext får inte bli rubrik för nästa mått', () => {
  for (const text of [
    'Q4 2025 Tillväxten väntas fortsätta i Q1 2026. ',
    'Q4 2025 Tillväxten under januari-mars 2026 väntas öka. ',
    'Q4 2025. Q1 2026 väntas tillväxten öka. ',
  ]) {
    assert.deepEqual(extraheraNyckeltal(arkiv(text + intakt('1000'), 'Q4 2025')), []);
  }
});

test('okända halvårs- och helårsrubriker blockerar dokumentets kvartal', () => {
  for (const lokal of ['H1 2025', 'H2 2025', 'Helåret 2025', 'Helår 2025', 'Första halvåret 2025', 'Full year 2025', 'First half 2025']) {
    assert.deepEqual(extraheraNyckeltal(arkiv(lokal + ' ' + intakt('1000'), 'Q4 2025')), [], lokal);
  }
});

test('motstridiga PDF-fakta spärrar perioden även för senare textträffar', () => {
  for (const values of [[100, 200, 100], [200, 100]]) {
    const ark = arkiv(intakt('100000'), 'Q4 2025');
    const original = ark[0].dokument[0];
    ark[0].dokument = values.map((nu, i) => ({ ...original, url: original.url + i,
      fakta: { omsattning: { nu, enhet: 'MSEK' } },
      kallor: { omsattning: { citat: `Nettoomsättningen uppgick till ${nu} MSEK`, sida: 2 } },
    }));
    assert.deepEqual(extraheraNyckeltal(ark), []);
  }
});

test('lokala rubriker efter publiceringsdatum fungerar utan bevarade radbrytningar', () => {
  const text = 'Delårsrapport juli 2021 - juni 2022 2022-08-25 April-juni 2022 ' +
    intakt('6969').slice(0, -1) + ' Juli 2021-juni 2022 ' + intakt('23412');
  assert.deepEqual(extraheraNyckeltal(arkiv(text)).map(p => [p.ar, p.kvartal, p.langd, p.varde]),
    [[2022, 2, 1, 6.969], [2022, 2, 4, 23.412]]);
});

test('motstridiga värden i samma period utelämnas oavsett ordning', () => {
  for (const values of [[1000, 2000, 1000], [2000, 1000]]) {
    const text = values.map(n => 'April-juni 2022 ' + intakt(n)).join(' ');
    assert.deepEqual(extraheraNyckeltal(arkiv(text, 'Q2 2022')), []);
  }
});

test('fyra hämtade lokala kvartal kan summeras med bevarade källställen', () => {
  const register = skapaFaktaregister();
  register.synka();
  register.prompt();
  const text = ['Januari-mars 2022', 'April-juni 2022', 'Juli-september 2022', 'Oktober-december 2022']
    .map((p, i) => p + ' ' + intakt((i + 1) * 1000)).join(' ');
  register.synka({ arkiv: arkiv(text) });
  const poster = register.poster().filter(p => p.typ === 'rapporterat' && p.matt === 'intäkter');
  assert.equal(poster.length, 4);
  const result = register.laggBeraknad({ operation: 'summa', indata: poster.map(p => p.id) });
  assert.equal(result.ok, true, result.skal);
  const sum = register.get(result.id);
  assert.equal(sum.varde, 10);
  assert.equal(sum.langd, 4);
  assert.equal(sum.kallor.length, 4);
  assert.deepEqual(new Set(sum.vilar_pa.poster), new Set(poster.map(p => p.id)));
});
