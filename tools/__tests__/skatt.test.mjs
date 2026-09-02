import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'fs';

/* public/labs/skatt.js ar ett klassiskt skript, inte en modul: dina-bolag.html
   laddar det med en vanlig script-tagg. Testet kor samma fil webblasaren kor,
   sa logiken finns pa ett stalle. Samma skal som inline-js-grinden finns av. */
const win = {};
new Function('window', readFileSync('public/labs/skatt.js', 'utf8'))(win);
const S = win.SKATT;

test('modulen exponerar det den ska', () => {
  assert.ok(S, 'window.SKATT saknas');
  assert.deepEqual(Object.keys(S.KONTON).sort(), ['depa', 'isk', 'kf']);
  assert.equal(S.STANDARDSATS, 30);
});

test('depa: vinsten beskattas', () => {
  const r = S.skattaRealiserat([{ belopp: 1000, konto: 'depa' }], 30);
  assert.equal(r.brutto, 1000);
  assert.equal(r.skatt, 300);
  assert.equal(r.netto, 700);
});

/* ISK och KF beskattas pa kapitalet via schablon, inte pa vinsten. Schablonen
   bygger pa statslanerantan och andras varje ar, sa den raknas inte har: den
   hor hemma som en inmatning, aldrig som ett fryst tal i koden. */
test('ISK och KF: ingen vinstskatt dras', () => {
  const r = S.skattaRealiserat([{ belopp: 1000, konto: 'isk' }, { belopp: 500, konto: 'kf' }], 30);
  assert.equal(r.skatt, 0);
  assert.equal(r.netto, 1500);
});

/* Inom depan kvittas vinst mot forlust innan skatten raknas. Att beskatta varje
   vinst for sig och ignorera forlusterna hade gett ett for hogt skattetal. */
test('depa: forlust kvittas mot vinst fore skatten', () => {
  const r = S.skattaRealiserat([
    { belopp: 1000, konto: 'depa' },
    { belopp: -400, konto: 'depa' },
  ], 30);
  assert.equal(r.brutto, 600);
  assert.equal(r.skatt, 180);
  assert.equal(r.netto, 420);
});

test('depa: en samlad forlust ger ingen skatt, och rakas inte som avdrag', () => {
  const r = S.skattaRealiserat([{ belopp: -1000, konto: 'depa' }], 30);
  assert.equal(r.skatt, 0);
  assert.equal(r.netto, -1000);
});

/* Ett innehav utan kontotyp far inte tyst beskattas, och inte tyst slippa
   heller. Det raknas obeskattat och sags rakt ut, samma linje som resten av
   sidan: hellre saga att vi inte vet an visa ett tal som ser sakert ut. */
test('okand kontotyp: obeskattat, men rakat och namngivet', () => {
  const r = S.skattaRealiserat([
    { belopp: 1000, konto: 'depa' },
    { belopp: 800, konto: null },
    { belopp: 200 },
  ], 30);
  assert.equal(r.skatt, 300);
  assert.equal(r.netto, 1700);
  assert.equal(r.okant, 2);
});

test('satsen ar ett argument, inte en konstant i koden', () => {
  assert.equal(S.skattaRealiserat([{ belopp: 1000, konto: 'depa' }], 22).skatt, 220);
  assert.equal(S.skattaRealiserat([{ belopp: 1000, konto: 'depa' }], 0).skatt, 0);
});

test('en orimlig sats faller tillbaka pa standarden i stallet for att ge nonsens', () => {
  assert.equal(S.skattaRealiserat([{ belopp: 1000, konto: 'depa' }], -5).skatt, 300);
  assert.equal(S.skattaRealiserat([{ belopp: 1000, konto: 'depa' }], 150).skatt, 300);
  assert.equal(S.skattaRealiserat([{ belopp: 1000, konto: 'depa' }], null).skatt, 300);
});

test('tom lista ger nollor, inte NaN', () => {
  assert.deepEqual(S.skattaRealiserat([], 30), { brutto: 0, skatt: 0, netto: 0, okant: 0, beskattat: 0 });
});

test('giltigtKonto slapper bara igenom de tre', () => {
  assert.equal(S.giltigtKonto('depa'), 'depa');
  assert.equal(S.giltigtKonto('ISK'), 'isk');
  assert.equal(S.giltigtKonto('sparkonto'), null);
  assert.equal(S.giltigtKonto(''), null);
});
