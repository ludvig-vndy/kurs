// Testar hamtningen och kallgrinden utan att rora en modell.
import test from 'node:test';
import assert from 'node:assert/strict';
import { hittaTal, ogrundadeTal, hamtaUtdrag, bolagIFragan } from '../../functions/api/_kallgrind.js';

test('hittaTal laser tusental med hart mellanslag', () => {
  const t = hittaTal('kassan uppgick till 62 304 860 kronor');
  assert.equal(t.length, 1);
  assert.equal(t[0].varde, 62304860);
});

test('hittaTal laser decimaler med komma', () => {
  assert.equal(hittaTal('blankningen var 5,92 procent')[0].varde, 5.92);
});

test('ogrundadeTal slapper igenom tal som star i utdraget', () => {
  const ut = [{ text: 'Rorelseresultatet blev 12,4 MSEK.' }];
  assert.equal(ogrundadeTal('Rorelseresultatet blev 12,4 MSEK.', ut, '').length, 0);
});

test('ogrundadeTal fangar en summa modellen raknat fram sjalv', () => {
  const ut = [{ text: 'Salde 10000 aktier och sedan 19000 aktier.' }];
  const fel = ogrundadeTal('Totalt salde han 29000 aktier.', ut, '');
  assert.equal(fel.length, 1);
  assert.equal(fel[0].varde, 29000);
});

test('ogrundadeTal later artal och kvartal passera', () => {
  assert.equal(ogrundadeTal('Under 2026 i kvartal 2 skedde det.', [{ text: 'inget alls' }], '').length, 0);
});

test('ogrundadeTal ekar tal ur fragan', () => {
  assert.equal(ogrundadeTal('Nej, 250 star inte i underlaget.', [{ text: 'tomt' }], 'Stammer 250?').length, 0);
});

test('hamtaUtdrag tar hogst tva bitar per dokument', () => {
  const arkiv = [{ namn: 'X', dokument: [{ url: 'u1', rubrik: 'kassa kassa', datum: '2026-01-01',
    bitar: ['kassa ett', 'kassa tva', 'kassa tre', 'kassa fyra'] }] }];
  assert.equal(hamtaUtdrag('kassa', arkiv, 6).length, 2);
});

test('bolagIFragan hittar bolaget pa forsta ordet', () => {
  const innehav = [{ name: 'Saniona AB (publ)', ticker: 'SANION' }, { name: 'Lifco AB', ticker: 'LIFCO-B' }];
  const t = bolagIFragan('hur ser sanionas kassa ut just nu?', innehav);
  assert.equal(t.length, 1);
  assert.equal(t[0].ticker, 'SANION');
});

test('bolagIFragan ger null nar inget bolag namns', () => {
  assert.equal(bolagIFragan('vad hande i natt?', [{ name: 'Lifco AB', ticker: 'LIFCO-B' }]), null);
});
