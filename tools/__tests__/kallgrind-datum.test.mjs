// Grinden far inte lasa datum som pastaenden om pengar.
//
// Hittat av provkorningen mot riktiga API:t, inte av stubbarna. Fragan gallde
// helaret 2022, modellen hamtade perioden och skrev ut VILKEN period den hamtat,
// och grinden stoppade hela svaret for att 12 och 31 ur "2022-12-31" lastes som
// ogrundade tal. Samma sak intraffade for horisontdatumen, som horisontregeln
// UTTRYCKLIGEN beordrar modellen att skriva ut.
//
// Det ar det varsta en grind kan gora: blockera ett sant svar for att det gjorde
// som det blivit tillsagt. Anvandaren ser bara en vagran, och drar slutsatsen
// att verktyget inte vet nagot.
import test from 'node:test';
import assert from 'node:assert/strict';
import { ogrundadeTal, utanDatum } from '../../functions/api/_kallgrind.js';

const UNDERLAG = [{ text: 'Likvida medel vid periodens utgang uppgick till 41 900 KSEK.' }];
const blockerade = (svar) => ogrundadeTal(svar, UNDERLAG, '', []).map((t) => t.rå);

test('perioden modellen hamtade far skrivas ut', () => {
  assert.deepEqual(blockerade('Jag hamtade perioden 2022-01-01 till 2022-12-31.'), []);
});

test('horisonten far skrivas ut, den ar beordrad i prompten', () => {
  assert.deepEqual(blockerade('Det jag har borjar 2026-08-28 och slutar 2026-08-28.'), []);
});

test('svenska datumformer racknas ocksa som datum', () => {
  assert.deepEqual(blockerade('Rapporten kom den 31 december 2022.'), []);
  assert.deepEqual(blockerade('Bokslutet avser december 2022.'), []);
  assert.deepEqual(blockerade('Siffran galler Q4 2022.'), []);
  assert.deepEqual(blockerade('Publicerad 28 aug 2026.'), []);
});

/* Halva poangen: grinden ska inte bli slappare for pengar. */
test('ett ogrundat belopp stoppas fortfarande, aven bredvid ett datum', () => {
  assert.deepEqual(blockerade('Den 31 december 2022 uppgick kassan till 419 000 KSEK.'), ['419 000']);
});

test('ett tal ur underlaget slapps igenom som forut', () => {
  assert.deepEqual(blockerade('Likvida medel uppgick till 41 900 KSEK.'), []);
});

/* Stadningen ror BARA svaret. Underlagets tal ar en tillatelselista, och att
   stada den skulle gora grinden strangare av misstag. */
test('utanDatum tar datumen men lamnar beloppen', () => {
  const t = utanDatum('Per 2022-12-31 var kassan 41 900 KSEK, mot 9 100 den 31 december 2021.');
  assert.ok(!t.includes('2022-12-31'));
  assert.ok(!t.includes('31 december 2021'));
  assert.ok(t.includes('41 900'));
  assert.ok(t.includes('9 100'));
});
