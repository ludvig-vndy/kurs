/* srs.ts, lightweight spaced-repetition store (Fas 1: a miss-queue).
   Records the latest result per question id in localStorage. A question is
   "missed" while its latest answer was wrong; answering it correctly clears it.
   Phase 2 will layer Leitner boxes + due dates on top of the same store. */

const KEY = 'kurs:srs:v1';
export const SRS_EVENT = 'kurs:srs';

interface Rec { ok: boolean; ts: number }
type Store = Record<string, Rec>;

function read(): Store {
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
    /* localStorage may be unavailable */
  }
  try {
    window.dispatchEvent(new Event(SRS_EVENT));
  } catch {
    /* no window (build) */
  }
}

/** Record the latest result for a question. */
export function recordResult(qid: string, ok: boolean): void {
  if (!qid) return;
  const store = read();
  store[qid] = { ok, ts: Date.now() };
  write(store);
}

/** Ids whose latest answer was wrong (the review queue). */
export function getMissed(): string[] {
  const store = read();
  return Object.keys(store).filter((id) => store[id] && store[id].ok === false);
}

export function missedCount(): number {
  return getMissed().length;
}
