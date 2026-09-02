import { test } from 'node:test';
import assert from 'node:assert/strict';
import { skalaUtgivare, samaBolag, nyaInsyn, INSYN_DYGN } from '../../motor/hamta-insyn.mjs';

/* FI har Saniona som "Saniona AB", innehavet heter "Saniona AB (publ)", och
   sökningen hos FI är en substrängmatch. Alltså noll träffar, varje natt, sedan
   bolaget lades in. Samma sorts bugg som 56b50c3 rättade mot Börsdata. */
test('skalaUtgivare: bolagsformen bort, bolagsnamnet kvar', () => {
  assert.equal(skalaUtgivare('Saniona AB (publ)'), 'Saniona');
  assert.equal(skalaUtgivare('Ferroamp AB (publ)'), 'Ferroamp');
  assert.equal(skalaUtgivare('Telia Company AB'), 'Telia Company');
  assert.equal(skalaUtgivare('Nokia Oyj'), 'Nokia');
  assert.equal(skalaUtgivare('Lime Technologies AB (publ.)'), 'Lime Technologies');
  assert.equal(skalaUtgivare(''), '');
});

/* Ett kortare namn ger en bredare sökning, så träffarna måste kontrolleras mot
   emittenten. Annars kan "Nyab" dra in ett annat bolag och brevet påstå att
   någon köpt aktier i fel bolag. */
test('samaBolag: emittenten maste vara bolaget, inte bara likna det', () => {
  assert.equal(samaBolag('Saniona AB', 'Saniona AB (publ)'), true);
  assert.equal(samaBolag('Saniona AB (publ)', 'Saniona'), true);
  assert.equal(samaBolag('Sanionix Holding AB', 'Saniona AB (publ)'), false);
  assert.equal(samaBolag('', 'Saniona'), false);
});

const T = [
  { pub: '2026-09-01', karaktar: 'Förvärv', person: 'Jorgen Drejer' },
  { pub: '2026-08-28', karaktar: 'Förvärv', person: 'Anna Ljung' },
  { pub: '2025-12-29', karaktar: 'Avyttring', person: 'Thomas Feldthus' },
];

test('nyaInsyn: med baslinje flaggas bara det som ar nyare', () => {
  assert.deepEqual(nyaInsyn(T, '2026-08-28', '2026-08-30').map(t => t.pub), ['2026-09-01']);
});

/* Utan baslinje rapporterade motorn INGENTING och satte bara en baslinje. Det
   hade tystat Sanionas tre köp och Ferroamps två för alltid: de var registrets
   första träffar för respektive bolag. Ett nytt bolag ska inte kosta en tyst
   vecka. */
test('nyaInsyn: utan baslinje flaggas det som ryms i fonstret', () => {
  assert.deepEqual(nyaInsyn(T, null, '2026-08-28').map(t => t.pub), ['2026-09-01', '2026-08-28']);
});

test('nyaInsyn: utan baslinje tystas det som ar aldre an fonstret', () => {
  assert.deepEqual(nyaInsyn(T, null, '2026-09-01').map(t => t.pub), ['2026-09-01']);
});

test('nyaInsyn: taket haller ett brev last', () => {
  const manga = Array.from({ length: 9 }, () => ({ pub: '2026-09-01', karaktar: 'Förvärv' }));
  assert.equal(nyaInsyn(manga, null, '2026-08-30').length, 3);
  assert.equal(nyaInsyn(manga, null, '2026-08-30', { tak: 5 }).length, 5);
});

test('nyaInsyn: tal fonstret ar satt och rimligt', () => {
  assert.ok(INSYN_DYGN >= 2 && INSYN_DYGN <= 7);
});
