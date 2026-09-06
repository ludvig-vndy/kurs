import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LAGEN, markerade, rutnatEtikett } from '../../src/components/fokus/rutnat.mjs';

/* Bakgrunden till att lage finns alls: `markerad` betydde tva saker i datan
   utan att formatet kunde skilja dem at. I 0.1-oddsen ar det ett ANTAL (elva
   fonder av hundra), i 1.1-aga-en-aktie en POSITION (rutan som ar du).
   Prototypen tolkade alltid antal, Astro-komponenten alltid position, sa
   0.1 renderade EN prick dar etiketten lovade elva. */

test('antal: elva av hundra ger elva markerade rutor', () => {
  const m = markerade({ celler: 100, markerad: 11, lage: 'antal' });
  assert.equal(m.size, 11);
  assert.ok(m.has(0) && m.has(10), 'de elva forsta ska vara markerade');
  assert.ok(!m.has(11), 'den tolfte ska inte vara markerad');
});

test('position: en enda ruta markeras, den pa angivet index', () => {
  const m = markerade({ celler: 28, markerad: 9, lage: 'position' });
  assert.deepEqual([...m], [9]);
});

test('lagena ar tva och uttalade', () => {
  assert.deepEqual(LAGEN, ['antal', 'position']);
});

test('okant lage markerar ingenting i stallet for att gissa', () => {
  assert.equal(markerade({ celler: 10, markerad: 3 }).size, 0);
  assert.equal(markerade({ celler: 10, markerad: 3, lage: 'flum' }).size, 0);
});

test('antal klamps till rutnatets storlek', () => {
  assert.equal(markerade({ celler: 10, markerad: 40, lage: 'antal' }).size, 10);
  assert.equal(markerade({ celler: 10, markerad: -3, lage: 'antal' }).size, 0);
});

test('position utanfor rutnatet markerar ingenting', () => {
  assert.equal(markerade({ celler: 10, markerad: 10, lage: 'position' }).size, 0);
  assert.equal(markerade({ celler: 10, markerad: -1, lage: 'position' }).size, 0);
});

/* Skarmlasaren fick tidigare "cell 12 av 100 markerad som Av 100 aktiva
   fonder slar ungefar 11 sitt index over 15 ar". Etiketten ska beskriva
   bilden, inte radda upp ett indexfel. */
test('etiketten beskriver antal respektive position', () => {
  assert.equal(
    rutnatEtikett({ celler: 100, markerad: 11, lage: 'antal', etikett: 'Av 100 aktiva fonder' }),
    'Rutnät: 11 av 100 rutor markerade. Av 100 aktiva fonder');
  assert.equal(
    rutnatEtikett({ celler: 28, markerad: 9, lage: 'position', etikett: 'DU' }),
    'Rutnät: en av 28 rutor markerad. DU');
});
