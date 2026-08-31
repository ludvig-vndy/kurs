import { test } from 'node:test';
import assert from 'node:assert/strict';
import { median, jamforbarHistorik, valjInstrument, hamtaKalender } from '../../motor/borsdata.mjs';
import { renderDagsbrev } from '../../motor/render-brev.mjs';

const ar = (...par) => par.map(([y, v]) => ({ y, v }));

test('median: udda och jamnt antal, och opaverkad av en extrem', () => {
  assert.equal(median([3, 1, 2]), 2);
  assert.equal(median([4, 1, 3, 2]), 2.5);
  assert.equal(median([1, 2, 3, 4, 1830]), 3);
});

test('jamforbarHistorik: normalfallet ger nu, median och avvikelse', () => {
  const r = jamforbarHistorik(14.1, ar([2025, 10], [2024, 12], [2023, 23], [2022, 29], [2021, 38]));
  assert.equal(r.nu, 14.1);
  assert.equal(r.median, 23);
  assert.equal(r.ar, 5);
  assert.equal(r.fran, 2021);
  assert.equal(r.till, 2025);
  assert.equal(r.avvikelse, -39);
});

/* MedCap: alla ar positiva, men 2018 star pa 1830 for att vinsten var nara noll.
   Medelvardet blir 220 och dagens 35 ser ut att ligga 84 procent under det
   normala. Medianen sager +1 procent, vilket ar sant. */
test('jamforbarHistorik: ett extremar far inte flytta jamforelsen', () => {
  const serie = ar([2025, 37], [2024, 29], [2023, 33], [2022, 28], [2021, 27],
    [2020, 49], [2019, 47], [2018, 1830], [2017, 102], [2016, 22]);
  const r = jamforbarHistorik(35, serie);
  const medel = serie.reduce((s, v) => s + v.v, 0) / serie.length;
  assert.ok(medel > 200, 'medelvardet ar forstort av extremaret');
  assert.equal(r.median, 35);
  assert.equal(r.avvikelse, 0);
});

test('jamforbarHistorik: negativt nu-varde ger ingen jamforelse', () => {
  assert.equal(jamforbarHistorik(-29.7, ar([2025, 10], [2024, 12], [2023, 23], [2022, 29], [2021, 38])), null);
});

/* Telia har 2022 och 2020 pa minus. En median over blandade tecken sager
   ingenting, sa hela jamforelsen ska falla. */
test('jamforbarHistorik: ett enda forlustar i fonstret stanger jamforelsen', () => {
  assert.equal(jamforbarHistorik(35, ar([2025, 31], [2024, 33], [2023, 349], [2022, -7], [2021, 13])), null);
});

// Lime saknar tal fore noteringen: Borsdata skriver nollor, inte null.
test('jamforbarHistorik: nollor raknas inte som positiva ar', () => {
  assert.equal(jamforbarHistorik(29, ar([2025, 21], [2024, 60], [2023, 55], [2022, 47], [2021, 0])), null);
});

test('jamforbarHistorik: for kort historik ger null', () => {
  assert.equal(jamforbarHistorik(20, ar([2025, 21], [2024, 22], [2023, 19])), null);
});

test('jamforbarHistorik: fonstret kapar aldre ar', () => {
  const serie = ar([2025, 10], [2024, 10], [2023, 10], [2022, 10], [2021, 10], [2015, 900]);
  assert.equal(jamforbarHistorik(10, serie, { fonster: 5 }).median, 10);
});

const INSTRUMENT = [
  { insId: 223, name: 'Telia Company' },
  { insId: 697, name: 'Telia Company' },
  { insId: 249, name: 'Nokia' },
  { insId: 687, name: 'Nokian Renkaat' },
  { insId: 1431, name: 'Unibap Space Solutions' },
];

test('valjInstrument: exakt namn, prefix och huvudnotering vid dubblett', () => {
  assert.equal(valjInstrument('Telia Company', INSTRUMENT).insId, 223);
  assert.equal(valjInstrument('Unibap Space Solutions', INSTRUMENT).insId, 1431);
  // "Nokia" far inte fastna i "Nokian Renkaat".
  assert.equal(valjInstrument('Nokia', INSTRUMENT).insId, 249);
  assert.equal(valjInstrument('Finns Ej', INSTRUMENT), null);
  assert.equal(valjInstrument('', INSTRUMENT), null);
});

test('hamtaKalender: utan nyckel svarar tomt i stallet for att kasta', async () => {
  const kvar = { api: process.env.BORSDATA_API, key: process.env.BORSDATA_API_KEY };
  delete process.env.BORSDATA_API; delete process.env.BORSDATA_API_KEY;
  try {
    assert.deepEqual(await hamtaKalender([440]), {});
  } finally {
    if (kvar.api) process.env.BORSDATA_API = kvar.api;
    if (kvar.key) process.env.BORSDATA_API_KEY = kvar.key;
  }
});

const RADER = [
  { bolag: 'Sectra', kalender: { datum: '2026-09-04', typ: 'Q1', dagar: 4 },
    vardering: { pe: { nu: 100.8, median: 86.4, ar: 10, fran: 2016, till: 2025, avvikelse: 17 }, evEbit: 77.6 } },
  { bolag: 'Unibap Space Solutions', kalender: { datum: '2026-11-04', typ: 'Q3', dagar: 65 }, vardering: null },
];

test('renderDagsbrev: kalenderblocket skrivs ut med datum och avvikelse', () => {
  const html = renderDagsbrev({ datum: '2026-08-31', poster: [], lugna: [], borsdata: RADER });
  assert.match(html, /Kalendern/);
  assert.match(html, /Sectra rapporterar på fredag/);
  assert.match(html, /4 september/);
  assert.match(html, /P\/E 100,8 mot 86,4/);
  assert.match(html, /17% över/);
});

/* Ett bolag utan jamforbar vardering ska lamna cellen tom. Att skriva ut varfor
   siffran saknas gor brevet svarare att lasa an att lata bli. */
test('renderDagsbrev: bolag utan jamforbar vardering far ingen siffra', () => {
  const html = renderDagsbrev({ datum: '2026-08-31', poster: [], lugna: [], borsdata: RADER });
  assert.match(html, /Unibap Space Solutions/);
  assert.doesNotMatch(html, /ej jämförbar/i);
});

test('renderDagsbrev: utan borsdata-rader finns inget kalenderblock', () => {
  const html = renderDagsbrev({ datum: '2026-08-31', poster: [], lugna: ['Lifco'] });
  assert.doesNotMatch(html, /Kalendern/);
  assert.match(html, /Inget nytt i något bevakat bolag/);
});

test('renderDagsbrev: nara rapport far egen formulering', () => {
  const idag = renderDagsbrev({ datum: '2026-08-31', poster: [], lugna: [],
    borsdata: [{ bolag: 'Lifco', kalender: { datum: '2026-08-31', typ: 'Q3', dagar: 0 }, vardering: null }] });
  assert.match(idag, /Lifco rapporterar i dag/);
  const langt = renderDagsbrev({ datum: '2026-08-31', poster: [], lugna: [],
    borsdata: [{ bolag: 'Lifco', kalender: { datum: '2026-10-23', typ: 'Q3', dagar: 53 }, vardering: null }] });
  assert.match(langt, /Närmast är Lifco, om 8 veckor/);
});
