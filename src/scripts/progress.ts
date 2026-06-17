/* Progress i localStorage: klarmarkering + bästa quizresultat per lektion.
   Funkar bara live på dev-server eller hostad sajt, inte vid file:// (ok). */

const KEY = 'kurs:progress:v1';
export const PROGRESS_EVENT = 'kurs:progress-change';

export interface LessonProgress {
  done?: boolean;
  quizPct?: number; // 0–100, bästa resultatet
}

type Store = Record<string, LessonProgress>;

function read(): Store {
  if (typeof localStorage === 'undefined') return {};
  try {
    return JSON.parse(localStorage.getItem(KEY) || '{}') as Store;
  } catch {
    return {};
  }
}

function write(store: Store): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(store));
  } catch {
    /* private mode / file:// — ignorera tyst */
  }
  window.dispatchEvent(new CustomEvent(PROGRESS_EVENT));
}

export function getAll(): Store {
  return read();
}

export function isDone(id: string): boolean {
  return Boolean(read()[id]?.done);
}

export function setDone(id: string, done: boolean): void {
  const store = read();
  store[id] = { ...store[id], done };
  write(store);
}

export function getQuizPct(id: string): number | undefined {
  return read()[id]?.quizPct;
}

/** Sparar bara om bättre än tidigare. */
export function setQuizPct(id: string, pct: number): void {
  const store = read();
  const prev = store[id]?.quizPct ?? -1;
  if (pct > prev) {
    store[id] = { ...store[id], quizPct: pct };
    write(store);
  }
}

export function completedCount(ids: string[]): number {
  const store = read();
  return ids.filter((id) => store[id]?.done).length;
}
