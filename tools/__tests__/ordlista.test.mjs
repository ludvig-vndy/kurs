import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

function load(rel) {
  return JSON.parse(readFileSync(fileURLToPath(new URL(rel, import.meta.url)), 'utf8'));
}
const ordlista = load('../../src/data/ordlista.json');
const course = load('../../content/fundamental-aktieanalys/course.json');
const lessonIds = new Set(
  (course.kapitel || []).flatMap((k) => (k.lektioner || []).map((l) => String(l.lektion)))
);

test('varje term har en icke-tom forklaring', () => {
  for (const [term, v] of Object.entries(ordlista)) {
    assert.ok(v && typeof v.forklaring === 'string' && v.forklaring.trim().length > 0, term);
  }
});

test('varje lektions-referens i ordlistan finns i kursen (ingen drift)', () => {
  const saknade = Object.entries(ordlista)
    .filter(([, v]) => v.lektion && !lessonIds.has(String(v.lektion)))
    .map(([t, v]) => t + ' -> ' + v.lektion);
  assert.deepEqual(saknade, []);
});

test('forklaringarna ar dashfria (husregeln)', () => {
  const traffar = Object.entries(ordlista)
    .filter(([, v]) => /[–—]/.test(v.forklaring))
    .map(([t]) => t);
  assert.deepEqual(traffar, []);
});
