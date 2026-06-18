/* localStorage-baserad kursmeta (svit + senaste position) och dev-upplåsning.
   Ren räknelogik ligger i state-core.mjs. Per webbläsare, inga konton. */

import {
  nextStreak,
  computeGate,
  resumeTarget,
} from './state-core.mjs';
import type { GateModule, OrderedLesson, ResumePos } from './state-core.mjs';
import { getAll } from './progress';

const META_KEY = 'kurs:meta:v1';
const DEV_KEY = 'kurs:dev-unlock';
export const META_EVENT = 'kurs:meta-change';

export { computeGate, resumeTarget };

export interface CourseMeta {
  lastLessonId?: string;
  lastStep?: number;
  streakCount?: number;
  streakLastDay?: string;
}

function readMeta(): CourseMeta {
  if (typeof localStorage === 'undefined') return {};
  try {
    return JSON.parse(localStorage.getItem(META_KEY) || '{}') as CourseMeta;
  } catch {
    return {};
  }
}

function writeMeta(meta: CourseMeta): void {
  try {
    localStorage.setItem(META_KEY, JSON.stringify(meta));
  } catch {
    /* private mode — ignorera */
  }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(META_EVENT));
  }
}

function todayISO(): string {
  const d = new Date();
  const z = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}`;
}

/** Bumpa sviten för dagens aktivitet (idempotent inom samma dag). */
export function touchStreak(): void {
  const m = readMeta();
  const s = nextStreak({ count: m.streakCount ?? 0, lastDay: m.streakLastDay }, todayISO());
  if (s.count !== m.streakCount || s.lastDay !== m.streakLastDay) {
    writeMeta({ ...m, streakCount: s.count, streakLastDay: s.lastDay });
  }
}

export function getStreak(): number {
  return readMeta().streakCount ?? 0;
}

export function getMeta(): CourseMeta {
  return readMeta();
}

/** Spara senaste position och bumpa sviten. Anropas av decket vid navigering. */
export function recordPosition(lessonId: string, step: number): void {
  const m = readMeta();
  writeMeta({ ...m, lastLessonId: lessonId, lastStep: step });
  touchStreak();
}

/** Lektions-id som markerats klara. */
export function getDoneIds(): string[] {
  const store = getAll();
  return Object.keys(store).filter((id) => store[id]?.done);
}

/**
 * "Fortsätt där du slutade" beräknat ur localStorage: senaste position om
 * upplåst & oavklarad, annars första upplåsta oavklarade lektionen.
 * `ordered` = lektioner i global ordning, `modules` = moduler i ordning (för gating).
 */
export function getResumeTarget(
  ordered: OrderedLesson[],
  modules: GateModule[]
): ResumePos | null {
  const doneIds = getDoneIds();
  const gate = computeGate(modules, doneIds, isDevUnlocked());
  return resumeTarget(getMeta(), ordered, doneIds, gate);
}

/* ---- Dev-upplåsning ---- */

export function isDevUnlocked(): boolean {
  try {
    return localStorage.getItem(DEV_KEY) === '1';
  } catch {
    return false;
  }
}

export function setDevUnlock(on: boolean): void {
  try {
    if (on) localStorage.setItem(DEV_KEY, '1');
    else localStorage.removeItem(DEV_KEY);
  } catch {
    /* ignorera */
  }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(META_EVENT));
  }
}

/** Läs ?unlock=1/0 och exponera window.__unlock(). Anropas en gång vid load. */
export function initDevUnlock(): void {
  if (typeof window === 'undefined') return;
  try {
    const q = new URL(location.href).searchParams.get('unlock');
    if (q === '1') setDevUnlock(true);
    if (q === '0') setDevUnlock(false);
  } catch {
    /* ignorera */
  }
  (window as unknown as { __unlock?: (on?: boolean) => boolean }).__unlock = (
    on: boolean = true
  ) => {
    setDevUnlock(Boolean(on));
    return isDevUnlocked();
  };
}
