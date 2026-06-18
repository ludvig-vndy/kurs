/* Ren logik för kursstate. Inga beroenden, ingen DOM, ingen localStorage.
   Testbar med `node --test`. Datumsträngar är 'YYYY-MM-DD' (lokal dag). */

/** Hela dagar mellan två 'YYYY-MM-DD' (b - a). */
export function daysBetween(a, b) {
  const da = Date.parse(a + 'T00:00:00Z');
  const db = Date.parse(b + 'T00:00:00Z');
  return Math.round((db - da) / 86400000);
}

/**
 * Nästa svit-state givet förra {count,lastDay} och dagens 'YYYY-MM-DD'.
 * samma dag -> oförändrat · nästa dag -> +1 · glapp/första -> reset till 1.
 */
export function nextStreak(prev, today) {
  const count = prev && typeof prev.count === 'number' ? prev.count : 0;
  const lastDay = prev && prev.lastDay ? prev.lastDay : undefined;
  if (!lastDay) return { count: 1, lastDay: today };
  const d = daysBetween(lastDay, today);
  if (d <= 0) return { count: Math.max(count, 1), lastDay };
  if (d === 1) return { count: count + 1, lastDay: today };
  return { count: 1, lastDay: today };
}

function toSet(ids) {
  return ids instanceof Set ? ids : new Set(ids);
}

/**
 * Gating över ordnade moduler.
 * @param {{key:string, lessonIds:string[]}[]} modules  i kursordning
 * @param {Set<string>|string[]} doneIds  avklarade lektions-id
 * @param {boolean} devUnlocked
 * @returns {{key:string, status:'done'|'unlocked'|'locked'}[]}
 */
export function computeGate(modules, doneIds, devUnlocked = false) {
  const done = toSet(doneIds);
  const moduleDone = (m) =>
    m.lessonIds.length > 0 && m.lessonIds.every((id) => done.has(id));
  return modules.map((m, i) => {
    const allDone = moduleDone(m);
    const unlocked = devUnlocked || i === 0 || moduleDone(modules[i - 1]);
    return { key: m.key, status: allDone ? 'done' : unlocked ? 'unlocked' : 'locked' };
  });
}

/**
 * "Fortsätt där du slutade": senaste position om upplåst & oavklarad,
 * annars första upplåsta oavklarade lektionen, annars null.
 * @param {{lastLessonId?:string,lastStep?:number}} meta
 * @param {{id:string, moduleKey:string}[]} ordered  lektioner i global ordning
 * @param {Set<string>|string[]} doneIds
 * @param {{key:string,status:string}[]} gate  resultat från computeGate
 */
export function resumeTarget(meta, ordered, doneIds, gate) {
  const done = toSet(doneIds);
  const unlockedModules = new Set(
    gate.filter((g) => g.status !== 'locked').map((g) => g.key)
  );
  const isUnlocked = (l) => unlockedModules.has(l.moduleKey);
  if (meta && meta.lastLessonId) {
    const last = ordered.find((l) => l.id === meta.lastLessonId);
    if (last && isUnlocked(last) && !done.has(last.id)) {
      return { lessonId: last.id, step: meta.lastStep ?? 0 };
    }
  }
  const firstIncomplete = ordered.find((l) => isUnlocked(l) && !done.has(l.id));
  return firstIncomplete ? { lessonId: firstIncomplete.id, step: 0 } : null;
}
