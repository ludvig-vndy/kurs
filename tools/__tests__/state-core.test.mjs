import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  daysBetween,
  nextStreak,
  computeGate,
  resumeTarget,
} from '../../src/scripts/state-core.mjs';

test('daysBetween counts whole days', () => {
  assert.equal(daysBetween('2026-06-17', '2026-06-18'), 1);
  assert.equal(daysBetween('2026-06-18', '2026-06-18'), 0);
  assert.equal(daysBetween('2026-06-01', '2026-06-08'), 7);
});

test('nextStreak: first activity starts at 1', () => {
  assert.deepEqual(nextStreak(undefined, '2026-06-18'), { count: 1, lastDay: '2026-06-18' });
});

test('nextStreak: same day is unchanged', () => {
  assert.deepEqual(
    nextStreak({ count: 3, lastDay: '2026-06-18' }, '2026-06-18'),
    { count: 3, lastDay: '2026-06-18' }
  );
});

test('nextStreak: consecutive day increments', () => {
  assert.deepEqual(
    nextStreak({ count: 3, lastDay: '2026-06-17' }, '2026-06-18'),
    { count: 4, lastDay: '2026-06-18' }
  );
});

test('nextStreak: a gap resets to 1', () => {
  assert.deepEqual(
    nextStreak({ count: 9, lastDay: '2026-06-15' }, '2026-06-18'),
    { count: 1, lastDay: '2026-06-18' }
  );
});

test('computeGate: module 1 open, later locked until prior done', () => {
  const modules = [
    { key: 'm1', lessonIds: ['1.1', '1.2'] },
    { key: 'm2', lessonIds: ['2.1'] },
    { key: 'm3', lessonIds: ['3.1'] },
  ];
  const gate = computeGate(modules, ['1.1'], false);
  assert.equal(gate[0].status, 'unlocked');
  assert.equal(gate[1].status, 'locked');
  assert.equal(gate[2].status, 'locked');
});

test('computeGate: completing a module unlocks the next and marks done', () => {
  const modules = [
    { key: 'm1', lessonIds: ['1.1', '1.2'] },
    { key: 'm2', lessonIds: ['2.1'] },
  ];
  const gate = computeGate(modules, ['1.1', '1.2'], false);
  assert.equal(gate[0].status, 'done');
  assert.equal(gate[1].status, 'unlocked');
});

test('computeGate: devUnlocked opens everything', () => {
  const modules = [
    { key: 'm1', lessonIds: ['1.1'] },
    { key: 'm2', lessonIds: ['2.1'] },
  ];
  const gate = computeGate(modules, [], true);
  assert.equal(gate[1].status, 'unlocked');
});

test('resumeTarget: returns last position when unlocked and incomplete', () => {
  const ordered = [
    { id: '1.1', moduleKey: 'm1' },
    { id: '1.2', moduleKey: 'm1' },
  ];
  const gate = computeGate([{ key: 'm1', lessonIds: ['1.1', '1.2'] }], ['1.1'], false);
  assert.deepEqual(
    resumeTarget({ lastLessonId: '1.2', lastStep: 2 }, ordered, ['1.1'], gate),
    { lessonId: '1.2', step: 2 }
  );
});

test('resumeTarget: falls back to first unlocked incomplete lesson', () => {
  const ordered = [
    { id: '1.1', moduleKey: 'm1' },
    { id: '1.2', moduleKey: 'm1' },
  ];
  const gate = computeGate([{ key: 'm1', lessonIds: ['1.1', '1.2'] }], ['1.1'], false);
  assert.deepEqual(resumeTarget({}, ordered, ['1.1'], gate), { lessonId: '1.2', step: 0 });
});

test('resumeTarget: null when all unlocked lessons are done', () => {
  const ordered = [{ id: '1.1', moduleKey: 'm1' }];
  const gate = computeGate([{ key: 'm1', lessonIds: ['1.1'] }], ['1.1'], false);
  assert.equal(resumeTarget({}, ordered, ['1.1'], gate), null);
});
