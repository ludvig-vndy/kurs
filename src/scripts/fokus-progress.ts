/* fokus-progress.ts -- localStorage progress for the Fokus course.
   Key: kurs:fokus:done (JSON array of lektion-id strings).
   SSR / private-mode guarded throughout. */

const FOKUS_KEY = 'kurs:fokus:done';
export const FOKUS_EVENT = 'kurs:fokus-change';

function read(): string[] {
  if (typeof localStorage === 'undefined') return [];
  try {
    const raw = localStorage.getItem(FOKUS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as string[]) : [];
  } catch {
    return [];
  }
}

function write(ids: string[]): void {
  try {
    localStorage.setItem(FOKUS_KEY, JSON.stringify(ids));
  } catch {
    /* private mode -- ignore silently */
  }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(FOKUS_EVENT));
  }
}

/** Mark a Fokus lektion as done. Idempotent. */
export function markFokusDone(lektion: string): void {
  const current = read();
  if (current.includes(lektion)) return;
  write([...current, lektion]);
}

/** Return the array of completed lektion-ids. */
export function getFokusDone(): string[] {
  return read();
}

/**
 * Return the first lektion-id in `order` that is NOT yet done.
 * Returns null if all are done.
 */
export function firstIncomplete(order: string[]): string | null {
  const done = read();
  for (const id of order) {
    if (!done.includes(id)) return id;
  }
  return null;
}
