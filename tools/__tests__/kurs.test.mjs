import { test } from 'node:test';
import assert from 'node:assert/strict';
import { KURSER, laddaKurs, laddaLektioner, byggLektionsvagar } from '../../src/lib/kurs.mjs';

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
