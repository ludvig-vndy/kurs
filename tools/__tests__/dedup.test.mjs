import { test } from 'node:test';
import assert from 'node:assert/strict';
import { findDuplicateSentences } from '../check-dedup.mjs';

test('flags a long sentence repeated across 3 lessons', () => {
  const lessons = [
    { path: 'a', body: 'Marknaden är likgiltig inför vad du en gång betalade för aktien.' },
    { path: 'b', body: 'Marknaden är likgiltig inför vad du en gång betalade för aktien.' },
    { path: 'c', body: 'Marknaden är likgiltig inför vad du en gång betalade för aktien.' },
  ];
  const dups = findDuplicateSentences(lessons, { minWords: 8, maxLessons: 2 });
  assert.equal(dups.length, 1);
  assert.equal(dups[0].count, 3);
});

test('does not flag a sentence in only two lessons', () => {
  const lessons = [
    { path: 'a', body: 'Detta är en tillräckligt lång mening för att räknas som kandidat här.' },
    { path: 'b', body: 'Detta är en tillräckligt lång mening för att räknas som kandidat här.' },
  ];
  assert.deepEqual(findDuplicateSentences(lessons, { minWords: 8, maxLessons: 2 }), []);
});
