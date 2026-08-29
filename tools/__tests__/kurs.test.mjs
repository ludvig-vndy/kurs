import { test } from 'node:test';
import assert from 'node:assert/strict';
import { KURSER, laddaKurs, laddaLektioner, byggLektionsvagar, delFor } from '../../src/lib/kurs.mjs';

test('KURSER innehåller aktiekursen med rätt bas och katalog', () => {
  const k = KURSER['fundamental-aktieanalys'];
  assert.equal(k.bas, '/fokus');
  assert.equal(k.katalog, 'content/fundamental-aktieanalys');
  assert.equal(k.ordlista, 'src/data/ordlista.json');
});

test('laddaKurs ger kapitel i stigande ordning', () => {
  const kurs = laddaKurs('fundamental-aktieanalys');
  assert.ok(kurs.kapitel.length > 0);
  const nummer = kurs.kapitel.map((k) => k.nummer);
  assert.deepEqual(nummer, [...nummer].sort((a, b) => a - b));
});

test('laddaLektioner läser varje lektionsfil som finns', () => {
  const lektioner = laddaLektioner('fundamental-aktieanalys');
  assert.ok(lektioner.length >= 60);
  assert.equal(lektioner[0].lektion, lektioner[0].data.lektion);
});

test('byggLektionsvagar länkar grannar och pekar på kapitelsidan vid kapitelbyte', () => {
  const vagar = byggLektionsvagar('fundamental-aktieanalys');
  assert.equal(vagar[0].prevHref, null);
  const byte = vagar.find((v) => v.nextIsChapter);
  assert.ok(byte, 'minst ett kapitelbyte ska finnas');
  assert.match(byte.nextHref, /^\/fokus\/kapitel\/\d+$/);
  const inom = vagar.find((v) => v.nextHref && !v.nextIsChapter);
  assert.match(inom.nextHref, /^\/fokus\/[\d.]+$/);
});

test('okänd kursnyckel kastar med tydligt fel', () => {
  assert.throws(() => laddaKurs('finns-inte'), /okänd kursnyckel/i);
});

test('delar täcker varje kapitel exakt en gång', () => {
  const kurs = laddaKurs('fundamental-aktieanalys');
  assert.ok(Array.isArray(kurs.delar) && kurs.delar.length > 0);
  const iDelar = kurs.delar.flatMap((d) => d.kapitel).sort((a, b) => a - b);
  const iKapitel = kurs.kapitel.map((k) => k.nummer).sort((a, b) => a - b);
  assert.deepEqual(iDelar, iKapitel);
});

test('delFor ger rätt del för ett kapitelnummer', () => {
  const kurs = laddaKurs('fundamental-aktieanalys');
  const d = delFor(kurs, 0);
  assert.equal(d.titel, 'Grunderna');
  assert.equal(d.n, 1);
});
