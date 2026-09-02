import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PAR, yahooSymbolFor, kursUrChart, tillSek, summeraSek } from '../../functions/api/_valuta.js';

/* FELET DETTA RÄTTAR. Portföljsumman lade ihop alla innehav rakt av och skrev
   "kr". Nokia hämtas som NOKIA.HE och står i euro; 8,54 euro räknades in i
   totalen som 8,54 kronor. Ett innehav i fel valuta ska aldrig tyst behandlas
   som kronor, det är bättre att säga att vi inte vet. */

test('PAR: varje valuta vi kan mota har ett Yahoo-par', () => {
  for (const v of ['EUR', 'USD', 'NOK', 'DKK', 'ISK']) assert.ok(PAR[v], v + ' saknas');
  assert.equal(PAR.SEK, undefined, 'SEK ar basen och behover inget par');
});

test('yahooSymbolFor: parnamnet ar valutan mot SEK', () => {
  assert.equal(yahooSymbolFor('USD'), 'USDSEK=X');
  assert.equal(yahooSymbolFor('eur'), 'EURSEK=X');
  assert.equal(yahooSymbolFor('SEK'), null);
  assert.equal(yahooSymbolFor('XYZ'), null);
});

const chart = pris => ({ chart: { result: [{ meta: { regularMarketPrice: pris } }] } });

test('kursUrChart: plockar kursen ur Yahoos svar', () => {
  assert.equal(kursUrChart(chart(11.42)), 11.42);
});

test('kursUrChart: ett trasigt svar ger null, inte en gissning', () => {
  assert.equal(kursUrChart(null), null);
  assert.equal(kursUrChart({ chart: { result: [] } }), null);
  assert.equal(kursUrChart(chart(0)), null);
  assert.equal(kursUrChart(chart('elva')), null);
});

const K = { SEK: 1, EUR: 11.4, USD: 9.6 };

test('tillSek: kronor gar rakt igenom', () => {
  assert.equal(tillSek(100, 'SEK', K), 100);
  assert.equal(tillSek(100, null, K), 100, 'okand valuta pa innehavet antas vara SEK-noterad');
});

test('tillSek: euro och dollar rakas om', () => {
  assert.equal(tillSek(100, 'EUR', K), 1140);
  assert.equal(Math.round(tillSek(10, 'usd', K)), 96);
});

/* Den viktiga: utan kurs ska vi inte rakna. Att falla tillbaka pa 1:1 ar
   precis det fel vi rattar, bara flyttat ett steg. */
test('tillSek: utan kand kurs blir svaret null, aldrig beloppet rakt av', () => {
  assert.equal(tillSek(100, 'JPY', K), null);
  assert.equal(tillSek(100, 'EUR', {}), null);
});

test('tillSek: icke-tal ger null', () => {
  assert.equal(tillSek(null, 'SEK', K), null);
  assert.equal(tillSek('hundra', 'SEK', K), null);
});

test('summeraSek: summerar det som gar, och namnger det som inte gar', () => {
  const r = summeraSek([
    { belopp: 100, valuta: 'SEK' },
    { belopp: 10, valuta: 'EUR' },
    { belopp: 5, valuta: 'JPY' },
  ], K);
  assert.equal(r.summa, 214);
  assert.deepEqual(r.saknas, ['JPY']);
  assert.equal(r.antal, 2);
});

test('summeraSek: en tom lista ar noll, inte NaN', () => {
  assert.deepEqual(summeraSek([], K), { summa: 0, antal: 0, saknas: [] });
});
