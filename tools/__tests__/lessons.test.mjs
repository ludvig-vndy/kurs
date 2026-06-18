import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadLessons } from '../lib/lessons.mjs';

test('loadLessons parses frontmatter, body and H2 sections', async () => {
  const lessons = await loadLessons('tools/__tests__/fixtures/ok');
  assert.equal(lessons.length, 1);
  const l = lessons[0];
  assert.equal(l.lektion, '1.1');
  assert.equal(l.modul, 1);
  assert.equal(l.frontmatter.titel, 'A');
  assert.deepEqual(l.sections, ['Kärnan', 'Övning']);
});
