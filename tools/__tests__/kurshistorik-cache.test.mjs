// Cachetiden pa /api/kurshistorik.
//
// Lag pa sex timmar rakt av. Kallan ar i praktiken realtid, sa den forsta
// besokaren i ett fonster fick ett farskt pris och alla efter fick samma frusna
// tal tills fonstret rullade. Piloten sag samma kurs morgon och eftermiddag mitt
// under en handelsdag: datan var farsk, vi holl kvar den.
//
// Tiden styrs nu av datan i stallet for av en borskalender, sa den sjalvjusterar
// over helger, roda dagar och tidszoner.
import test from 'node:test';
import assert from 'node:assert/strict';
import { cacheTid, CACHE_LIVE, CACHE_NYSS, CACHE_STANGT } from '../../functions/api/kurshistorik.js';

const NU = Date.parse('2026-09-07T12:43:00Z');
const forMinuterSedan = (m) => (NU - m * 60000) / 1000;

test('pagaende handel cachas kort', () => {
  assert.equal(cacheTid(forMinuterSedan(0), NU), CACHE_LIVE);
  assert.equal(cacheTid(forMinuterSedan(5), NU), CACHE_LIVE);
  assert.equal(cacheTid(forMinuterSedan(44), NU), CACHE_LIVE);
});

/* Ett illikvitt bolag kan sakna avslut i en halvtimme mitt under handelsdagen.
   Unibap lag 30 minuter efter de likvida bolagen vid matningen, och det var
   marknadens tillstand, inte en fordrojning. Det far inte gora oss langsamma. */
test('ett illikvitt bolag utan avslut pa en halvtimme raknas anda som live', () => {
  assert.equal(cacheTid(forMinuterSedan(30), NU), CACHE_LIVE);
});

test('nyss stangt cachas medellangt', () => {
  assert.equal(cacheTid(forMinuterSedan(60), NU), CACHE_NYSS);
  assert.equal(cacheTid(forMinuterSedan(11 * 60), NU), CACHE_NYSS);
});

test('kvall, natt och helg cachas langt', () => {
  assert.equal(cacheTid(forMinuterSedan(13 * 60), NU), CACHE_STANGT);
  assert.equal(cacheTid(forMinuterSedan(3 * 24 * 60), NU), CACHE_STANGT);
});

test('utan tidsstampel valjs mitten, aldrig det langsta', () => {
  assert.equal(cacheTid(null, NU), CACHE_NYSS);
  assert.equal(cacheTid(0, NU), CACHE_NYSS);
  assert.equal(cacheTid(NaN, NU), CACHE_NYSS);
  assert.equal(cacheTid(undefined, NU), CACHE_NYSS);
});

/* En tidsstampel i framtiden ar en klockskillnad mellan oss och kallan, inte ett
   fel i datan. Att da valja den langsta cachen vore precis fel hall. */
test('en tidsstampel i framtiden behandlas som live', () => {
  assert.equal(cacheTid(forMinuterSedan(-3), NU), CACHE_LIVE);
});

test('taken ar valda, inte glidande', () => {
  assert.equal(CACHE_LIVE, 60);
  assert.ok(CACHE_LIVE < CACHE_NYSS && CACHE_NYSS < CACHE_STANGT);
  assert.ok(CACHE_STANGT <= 3600, 'aldrig mer an en timme, aven nar borsen ar stangd');
});
