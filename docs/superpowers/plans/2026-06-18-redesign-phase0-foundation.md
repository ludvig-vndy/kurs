# Redesign Phase 0 — Foundation & State — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Establish the shared substrate for the Ägarboken redesign — handoff design tokens, fonts, shared theme, app chrome (`AppShell`/`Rail`/`BottomNav`), and the real state/gating model — without breaking the currently-working site.

**Architecture:** Revalue `tokens.css` to the handoff's exact variable names (Platform/Lesson vocabulary) with a temporary alias shim so not-yet-rebuilt components keep working. Migrate the theme key to `agarboken-theme`. Add a pure, unit-tested `.mjs` state core (streak/gating/resume) with a thin `.ts` localStorage wrapper. Build `AppShell` chrome but do **not** wire it to `/` yet — existing pages keep rendering with the new look.

**Tech Stack:** Astro 5, TypeScript (strict, `allowJs`), plain `.mjs` modules tested with `node --test`, CSS custom properties.

**Spec:** `docs/superpowers/specs/2026-06-18-redesign-phase0-foundation-design.md`

---

## File Structure

**Create:**
- `src/scripts/state-core.mjs` — pure streak/gating/resume logic (no DOM, no localStorage)
- `src/scripts/state-core.d.ts` — types for the core
- `src/scripts/state.ts` — localStorage meta + dev-unlock wiring (uses core)
- `src/components/Rail.astro` — desktop 248px left rail (incl. visible dev toggle)
- `src/components/BottomNav.astro` — mobile bottom nav (<760px)
- `src/layouts/AppShell.astro` — composes Rail + BottomNav + main
- `src/pages/dev/shell.astro` — scratch verification page for the new chrome
- `tools/__tests__/state-core.test.mjs` — unit tests for the core

**Modify:**
- `src/styles/tokens.css` — canonical handoff tokens + alias shim
- `src/layouts/BaseLayout.astro` — font `<link>`, inline theme-init key
- `src/scripts/theme.ts` — key → `agarboken-theme` + migration helper
- `src/components/ThemeToggle.astro` — call `migrateThemeKey()` on load

**Untouched (kept working via alias shim):** all other components, `LessonLayout`, `index.astro`, `progress.ts`, `Sidebar.astro`.

---

## Task 1: Design tokens — canonical handoff names + alias shim

**Files:**
- Modify (full rewrite): `src/styles/tokens.css`

- [ ] **Step 1: Rewrite `tokens.css`**

Replace the entire file with:

```css
/* ============================================================
   Designtokens — Ägarboken. Exakta handoff-variabelnamn
   (Plattform/Lektion-vokabulären). Mörkt ("fokus") är default;
   [data-theme="light"] = ljust ("ed"). §3.3-aliaslagret längst ner
   håller ej-ännu-ombyggda komponenter vid liv — tas bort per fas.
   ============================================================ */

:root {
  /* --- Typografi (handoff-namn) --- */
  --serif: "Newsreader", Georgia, "Times New Roman", serif;
  --sans: "Schibsted Grotesk", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  --mono: "IBM Plex Mono", ui-monospace, SFMono-Regular, Menlo, monospace;

  /* Brödtextstorlek (Kompakt 18 / Standard 20 / Stor 23) */
  --prose-size: 20px;

  /* UI-storleksskala (behålls) */
  --text-xs: 0.79rem;
  --text-sm: 0.889rem;
  --text-base: 1rem;
  --text-md: 1.1875rem;
  --text-lg: 1.333rem;
  --text-xl: 1.602rem;
  --text-2xl: 1.924rem;
  --text-3xl: 2.311rem;

  --leading-tight: 1.15;
  --leading-snug: 1.35;
  --leading-body: 1.62;
  --measure: 65ch;

  /* --- Spacing (behålls) --- */
  --space-1: 0.25rem;
  --space-2: 0.5rem;
  --space-3: 0.75rem;
  --space-4: 1rem;
  --space-5: 1.5rem;
  --space-6: 2rem;
  --space-7: 3rem;
  --space-8: 4rem;
  --space-9: 6rem;

  /* --- Form --- */
  --radius-sm: 6px;
  --radius-md: 10px;
  --radius-lg: 16px;
  --radius-full: 99px;
  --rail-width: 248px;

  /* Behålls tills LessonLayout byggs om (Fas 1) */
  --sidebar-width: 312px;
  --content-max: 720px;

  /* --- Motion (behålls) --- */
  --dur-micro: 150ms;
  --dur-comp: 250ms;
  --dur-reveal: 520ms;
  --ease-out: cubic-bezier(0.16, 1, 0.3, 1);
  --ease-standard: cubic-bezier(0.4, 0, 0.2, 1);
}

/* ===================== MÖRKT (default, "fokus") ===================== */
:root,
:root[data-theme="dark"] {
  color-scheme: dark;
  --bg: #0a0c0b;
  --surface: #11140f;
  --surface-2: #161a14;
  --border: rgba(255, 255, 255, 0.09);
  --border-2: rgba(255, 255, 255, 0.16);
  --text: #f0ede4;
  --prose: #c3c7bc;
  --muted: #777f73;
  --faint: #333a32;
  --mint: #8fd3b0;
  --mint-2: #a6e0c4;
  --mint-soft: rgba(143, 211, 176, 0.11);
  --on-mint: #0a0c0b;
  --line-price: #6f7a72;
  --good: #8fd3b0;
  --good-soft: rgba(143, 211, 176, 0.12);
  --mid: #e3c06a;
  --bad: #e0a08a;
  --bad-soft: rgba(224, 160, 138, 0.12);

  --glow-mint: 0 8px 22px -6px var(--mint);
  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.4);
  --shadow-md: 0 8px 28px rgba(0, 0, 0, 0.45);
}

/* ===================== LJUST ("ed") ===================== */
:root[data-theme="light"] {
  color-scheme: light;
  --bg: #efe9dc;
  --surface: #f7f2e7;
  --surface-2: #fcfaf3;
  --border: rgba(30, 36, 31, 0.14);
  --border-2: rgba(30, 36, 31, 0.24);
  --text: #1e241f;
  --prose: #3c4239;
  --muted: #6e7568;
  --faint: #cbc3b2;
  --mint: #1c6e50;
  --mint-2: #155741;
  --mint-soft: rgba(28, 110, 80, 0.1);
  --on-mint: #f6f3ea;
  --line-price: #9aa6b3;
  --good: #3e7a4f;
  --good-soft: rgba(62, 122, 79, 0.12);
  --mid: #9a7320;
  --bad: #a8473a;
  --bad-soft: rgba(168, 71, 58, 0.1);

  --glow-mint: 0 8px 22px -6px var(--mint);
  --shadow-sm: 0 1px 2px rgba(31, 30, 27, 0.06);
  --shadow-md: 0 12px 32px rgba(31, 30, 27, 0.1);
}

/* ============ Kompatibilitetslager (tillfälligt, §3.3) ============
   Ny kod använder handoff-namnen direkt. Aliasen tas bort
   allteftersom komponenter byggs om; hela blocket bort efter Fas 2. */
:root {
  --bg-elev: var(--surface);
  --text-muted: var(--muted);
  --text-faint: var(--faint);
  --border-strong: var(--border-2);
  --accent: var(--mint);
  --accent-hover: var(--mint-2);
  --accent-contrast: var(--on-mint);
  --accent-soft: var(--mint-soft);
  --accent-line: var(--border-2);
  --font-serif: var(--serif);
  --font-sans: var(--sans);
  --ok: var(--good);
  --ok-bg: var(--good-soft);
  --ok-border: var(--good);
  --err: var(--bad);
  --err-bg: var(--bad-soft);
  --err-border: var(--bad);
}
```

- [ ] **Step 2: Build to verify nothing references a now-undefined token**

Run: `npm run build`
Expected: build succeeds (`dist/` generated, no errors).

- [ ] **Step 3: Sanity-grep that old token names still resolve via the shim**

Run: `node -e "const c=require('fs').readFileSync('src/styles/tokens.css','utf8'); for(const t of ['--accent:','--text-muted:','--font-serif:','--ok:','--sidebar-width:','--content-max:']) if(!c.includes(t)) throw new Error('missing '+t); console.log('shim ok')"`
Expected: `shim ok`

- [ ] **Step 4: Commit**

```bash
git add src/styles/tokens.css
git commit -m "feat(redesign): adopt handoff design tokens + compat alias shim"
```

---

## Task 2: Fonts + shared theme key (`agarboken-theme`)

**Files:**
- Modify: `src/layouts/BaseLayout.astro` (font `<link>` ~line 22-25; inline init ~line 31-35)
- Modify: `src/scripts/theme.ts`
- Modify: `src/components/ThemeToggle.astro` (script ~line 68-79)

- [ ] **Step 1: Swap the font `<link>` in `BaseLayout.astro`**

Replace this block:

```astro
    <link
      href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;650&family=Source+Serif+4:opsz,wght@8..60,400;8..60,500;8..60,600&display=swap"
      rel="stylesheet"
    />
```

with:

```astro
    <link
      href="https://fonts.googleapis.com/css2?family=Newsreader:ital,opsz,wght@0,6..72,300;0,6..72,400;0,6..72,500;1,6..72,400&family=Schibsted+Grotesk:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500;600&display=swap"
      rel="stylesheet"
    />
```

- [ ] **Step 2: Update the inline no-flash theme init in `BaseLayout.astro`**

Replace:

```astro
        try {
          var t = localStorage.getItem('kurs:theme');
          if (t === 'light' || t === 'dark') {
            document.documentElement.setAttribute('data-theme', t);
          }
        } catch (e) {}
```

with:

```astro
        try {
          var t = localStorage.getItem('agarboken-theme') || localStorage.getItem('kurs:theme');
          if (t === 'light' || t === 'dark') {
            document.documentElement.setAttribute('data-theme', t);
          }
        } catch (e) {}
```

- [ ] **Step 3: Rewrite `src/scripts/theme.ts` with the new key + migration**

```ts
/* Tema-toggle. Mörkt är default. Initieras utan flash via inline-script
   i <head> (se BaseLayout). Delas av alla ytor via nyckeln agarboken-theme. */

const KEY = 'agarboken-theme';
const OLD_KEY = 'kurs:theme';
export type Theme = 'dark' | 'light';

export function getTheme(): Theme {
  const attr = document.documentElement.getAttribute('data-theme');
  return attr === 'light' ? 'light' : 'dark';
}

export function setTheme(theme: Theme): void {
  document.documentElement.setAttribute('data-theme', theme);
  try {
    localStorage.setItem(KEY, theme);
  } catch {
    /* ignorera */
  }
}

export function toggleTheme(): Theme {
  const next: Theme = getTheme() === 'dark' ? 'light' : 'dark';
  setTheme(next);
  return next;
}

/** Engångsmigrering: kopiera gammal nyckel till ny om den nya saknas. */
export function migrateThemeKey(): void {
  try {
    if (!localStorage.getItem(KEY)) {
      const old = localStorage.getItem(OLD_KEY);
      if (old === 'light' || old === 'dark') localStorage.setItem(KEY, old);
    }
  } catch {
    /* ignorera */
  }
}
```

- [ ] **Step 4: Call `migrateThemeKey()` on load in `ThemeToggle.astro`**

Replace the `<script>` block:

```astro
<script>
  import { toggleTheme } from '../scripts/theme';

  function wire() {
    document.querySelectorAll<HTMLButtonElement>('.theme-toggle').forEach((btn) => {
      if (btn.dataset.wired) return;
      btn.dataset.wired = '1';
      btn.addEventListener('click', () => toggleTheme());
    });
  }
  document.addEventListener('astro:page-load', wire);
</script>
```

with:

```astro
<script>
  import { toggleTheme, migrateThemeKey } from '../scripts/theme';

  function wire() {
    document.querySelectorAll<HTMLButtonElement>('.theme-toggle').forEach((btn) => {
      if (btn.dataset.wired) return;
      btn.dataset.wired = '1';
      btn.addEventListener('click', () => toggleTheme());
    });
  }
  document.addEventListener('astro:page-load', () => {
    migrateThemeKey();
    wire();
  });
</script>
```

- [ ] **Step 5: Build to verify**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 6: Commit**

```bash
git add src/layouts/BaseLayout.astro src/scripts/theme.ts src/components/ThemeToggle.astro
git commit -m "feat(redesign): Newsreader/Schibsted/Plex fonts + shared agarboken-theme key"
```

---

## Task 3: Pure state core (`state-core.mjs`) — TDD

**Files:**
- Create: `src/scripts/state-core.mjs`
- Create: `src/scripts/state-core.d.ts`
- Test: `tools/__tests__/state-core.test.mjs`

- [ ] **Step 1: Write the failing test**

Create `tools/__tests__/state-core.test.mjs`:

```js
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
  assert.equal(gate[0].status, 'unlocked'); // m1 open, not all done
  assert.equal(gate[1].status, 'locked');   // m1 not complete
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
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test "tools/__tests__/state-core.test.mjs"`
Expected: FAIL — cannot find module `../../src/scripts/state-core.mjs`.

- [ ] **Step 3: Implement `src/scripts/state-core.mjs`**

```js
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
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `node --test "tools/__tests__/state-core.test.mjs"`
Expected: PASS — all tests green.

- [ ] **Step 5: Add the type declarations `src/scripts/state-core.d.ts`**

```ts
export interface StreakState {
  count: number;
  lastDay?: string;
}
export function daysBetween(a: string, b: string): number;
export function nextStreak(
  prev: { count?: number; lastDay?: string } | undefined,
  today: string
): StreakState;

export interface GateModule {
  key: string;
  lessonIds: string[];
}
export interface GateResult {
  key: string;
  status: 'done' | 'unlocked' | 'locked';
}
export function computeGate(
  modules: GateModule[],
  doneIds: Set<string> | string[],
  devUnlocked?: boolean
): GateResult[];

export interface OrderedLesson {
  id: string;
  moduleKey: string;
}
export interface ResumePos {
  lessonId: string;
  step: number;
}
export function resumeTarget(
  meta: { lastLessonId?: string; lastStep?: number } | undefined,
  ordered: OrderedLesson[],
  doneIds: Set<string> | string[],
  gate: GateResult[]
): ResumePos | null;
```

- [ ] **Step 6: Commit**

```bash
git add src/scripts/state-core.mjs src/scripts/state-core.d.ts tools/__tests__/state-core.test.mjs
git commit -m "feat(redesign): pure state core (streak/gating/resume) with unit tests"
```

---

## Task 4: localStorage state wrapper + dev-unlock (`state.ts`)

**Files:**
- Create: `src/scripts/state.ts`

- [ ] **Step 1: Implement `src/scripts/state.ts`**

```ts
/* localStorage-baserad kursmeta (svit + senaste position) och dev-upplåsning.
   Ren räknelogik ligger i state-core.mjs. Per webbläsare, inga konton. */

import {
  nextStreak,
  computeGate,
  resumeTarget,
} from './state-core.mjs';

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
```

- [ ] **Step 2: Type-check by building**

Run: `npm run build`
Expected: build succeeds (state.ts compiles; `.mjs` import resolves with `.d.ts` types).

- [ ] **Step 3: Commit**

```bash
git add src/scripts/state.ts
git commit -m "feat(redesign): localStorage state wrapper + dev-unlock (?unlock / __unlock)"
```

---

## Task 5: Rail + BottomNav components

**Files:**
- Create: `src/components/Rail.astro`
- Create: `src/components/BottomNav.astro`

> Phase-0 nav targets point to `/` (dashboard/overview/tool routes arrive in Phase 2). The `active` prop drives highlighting. The rail bottom holds the theme toggle and a **dev toggle** that is hidden until dev-unlock has been enabled at least once.

- [ ] **Step 1: Create `src/components/Rail.astro`**

```astro
---
import ThemeToggle from './ThemeToggle.astro';

interface Props {
  active?: 'hem' | 'kurs' | 'verktyg' | 'lektion';
}
const { active = 'hem' } = Astro.props;

// Fas 0: platshållarmål. Fas 2 byter till riktiga rutter.
const ROUTES = { hem: '/', kurs: '/', verktyg: '/' };
const items = [
  { key: 'hem', label: 'Hem', href: ROUTES.hem },
  { key: 'kurs', label: 'Kursöversikt', href: ROUTES.kurs },
] as const;
---

<aside class="rail" aria-label="Sidomeny">
  <div class="rail__top">
    <a href={ROUTES.hem} class="brand" data-astro-prefetch>
      <span class="brand__mark" aria-hidden="true"></span>
      <span class="brand__text">Ägarboken</span>
    </a>

    <div class="rail__section-label">LÄRA</div>
    <nav class="rail__group">
      {items.map((it) => (
        <a
          href={it.href}
          class:list={['rail__item', { 'is-active': active === it.key }]}
          aria-current={active === it.key ? 'page' : undefined}
        >
          <span class="rail__dot" aria-hidden="true"></span>
          {it.label}
        </a>
      ))}
      <slot name="context" />
    </nav>

    <div class="rail__section-label">VERKTYG</div>
    <nav class="rail__group">
      <a
        href={ROUTES.verktyg}
        class:list={['rail__item', { 'is-active': active === 'verktyg' }]}
        aria-current={active === 'verktyg' ? 'page' : undefined}
      >
        <span class="rail__dot" aria-hidden="true"></span>
        Analysverktyg
      </a>
    </nav>
  </div>

  <div class="rail__bottom">
    <button type="button" class="rail__dev" data-dev-toggle hidden aria-pressed="false">
      DEV: lås upp allt
    </button>
    <div class="rail__bottom-row">
      <ThemeToggle />
      <span class="rail__profile">Du</span>
    </div>
  </div>
</aside>

<style>
  .rail {
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    height: 100%;
    width: var(--rail-width);
    padding: 26px 18px;
    border-right: 1px solid var(--border);
    background: var(--bg);
  }
  .brand {
    display: flex;
    align-items: center;
    gap: 11px;
    padding: 0 8px;
    margin-bottom: 34px;
    color: var(--text);
  }
  .brand:hover {
    text-decoration: none;
  }
  .brand__mark {
    width: 26px;
    height: 26px;
    border-radius: 7px;
    background: var(--mint);
    box-shadow: var(--glow-mint);
    flex-shrink: 0;
  }
  .brand__text {
    font-family: var(--sans);
    font-weight: 600;
    font-size: var(--text-base);
    letter-spacing: -0.01em;
  }
  .rail__section-label {
    font-family: var(--sans);
    font-weight: 600;
    font-size: 10px;
    letter-spacing: 0.16em;
    color: var(--muted);
    padding: 0 10px;
    margin: 0 0 10px;
  }
  .rail__group {
    display: flex;
    flex-direction: column;
    gap: 3px;
    margin-bottom: 26px;
  }
  .rail__item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 10px 12px;
    border-radius: 11px;
    font-family: var(--sans);
    font-weight: 500;
    font-size: 14px;
    color: var(--muted);
    transition:
      color var(--dur-micro) var(--ease-standard),
      background var(--dur-micro) var(--ease-standard);
  }
  .rail__item:hover {
    color: var(--text);
    background: var(--surface);
    text-decoration: none;
  }
  .rail__item.is-active {
    color: var(--text);
    background: var(--mint-soft);
  }
  .rail__dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: currentColor;
    opacity: 0.55;
    flex-shrink: 0;
  }
  .rail__item.is-active .rail__dot {
    background: var(--mint);
    opacity: 1;
  }
  .rail__bottom {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .rail__dev {
    font-family: var(--sans);
    font-weight: 600;
    font-size: 11px;
    letter-spacing: 0.04em;
    color: var(--on-mint);
    background: var(--mid);
    border: none;
    border-radius: 9px;
    padding: 8px 10px;
    cursor: pointer;
    text-align: left;
  }
  .rail__dev[aria-pressed='true']::after {
    content: ' ✓';
  }
  .rail__bottom-row {
    display: flex;
    align-items: center;
    gap: 13px;
    padding: 0 4px;
  }
  .rail__profile {
    font-family: var(--sans);
    font-size: 13px;
    color: var(--muted);
  }
</style>

<script>
  import { initDevUnlock, isDevUnlocked, setDevUnlock, META_EVENT } from '../scripts/state';

  function paintDev() {
    const on = isDevUnlocked();
    document.querySelectorAll<HTMLElement>('[data-dev-toggle]').forEach((el) => {
      el.hidden = !on;
      el.setAttribute('aria-pressed', String(on));
    });
  }
  function wireDev() {
    document.querySelectorAll<HTMLButtonElement>('[data-dev-toggle]').forEach((btn) => {
      if (btn.dataset.wired) return;
      btn.dataset.wired = '1';
      btn.addEventListener('click', () => setDevUnlock(!isDevUnlocked()));
    });
  }
  document.addEventListener('astro:page-load', () => {
    initDevUnlock();
    wireDev();
    paintDev();
  });
  window.addEventListener(META_EVENT, paintDev);
</script>
```

- [ ] **Step 2: Create `src/components/BottomNav.astro`**

```astro
---
interface Props {
  active?: 'hem' | 'kurs' | 'verktyg' | 'lektion';
}
const { active = 'hem' } = Astro.props;
const ROUTES = { hem: '/', kurs: '/', verktyg: '/' };
const items = [
  { key: 'hem', label: 'Hem', href: ROUTES.hem },
  { key: 'kurs', label: 'Kurs', href: ROUTES.kurs },
  { key: 'verktyg', label: 'Verktyg', href: ROUTES.verktyg },
] as const;
---

<nav class="bottomnav" aria-label="Bottenmeny">
  {items.map((it) => (
    <a
      href={it.href}
      class:list={['bottomnav__item', { 'is-active': active === it.key }]}
      aria-current={active === it.key ? 'page' : undefined}
    >
      {it.label}
    </a>
  ))}
</nav>

<style>
  .bottomnav {
    display: none;
    position: fixed;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 30;
    background: var(--bg);
    border-top: 1px solid var(--border);
    padding: 7px 4px;
    align-items: stretch;
  }
  .bottomnav__item {
    flex: 1;
    text-align: center;
    padding: 10px 4px;
    font-family: var(--sans);
    font-weight: 500;
    font-size: 12px;
    color: var(--muted);
    border-radius: 9px;
  }
  .bottomnav__item:hover {
    text-decoration: none;
  }
  .bottomnav__item.is-active {
    color: var(--text);
    background: var(--mint-soft);
  }
  @media (max-width: 760px) {
    .bottomnav {
      display: flex;
    }
  }
</style>
```

- [ ] **Step 3: Build to verify both components compile**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 4: Commit**

```bash
git add src/components/Rail.astro src/components/BottomNav.astro
git commit -m "feat(redesign): Rail + BottomNav chrome with visible dev toggle"
```

---

## Task 6: AppShell layout + scratch verification page

**Files:**
- Create: `src/layouts/AppShell.astro`
- Create: `src/pages/dev/shell.astro`

- [ ] **Step 1: Create `src/layouts/AppShell.astro`**

```astro
---
import BaseLayout from './BaseLayout.astro';
import Rail from '../components/Rail.astro';
import BottomNav from '../components/BottomNav.astro';

interface Props {
  title: string;
  active?: 'hem' | 'kurs' | 'verktyg' | 'lektion';
  maxWidth?: number;
}
const { title, active = 'hem', maxWidth = 1000 } = Astro.props;
---

<BaseLayout title={title}>
  <div class="app">
    <div class="app__rail">
      <Rail active={active}>
        <slot name="rail-context" slot="context" />
      </Rail>
    </div>

    <main class="app__main">
      <div class="app__inner" style={`--maxw:${maxWidth}px`}>
        <slot />
      </div>
    </main>

    <BottomNav active={active} />
  </div>
</BaseLayout>

<style>
  .app__rail {
    position: fixed;
    inset: 0 auto 0 0;
    width: var(--rail-width);
    z-index: 6;
  }
  .app__main {
    margin-left: var(--rail-width);
    min-height: 100vh;
  }
  .app__inner {
    max-width: var(--maxw);
    margin: 0 auto;
    padding: 54px clamp(40px, 5vw, 76px) 70px;
  }
  @media (max-width: 760px) {
    .app__rail {
      display: none;
    }
    .app__main {
      margin-left: 0;
    }
    .app__inner {
      padding: 32px clamp(18px, 5vw, 28px) 96px; /* botten-padding för bottenmenyn */
    }
  }
</style>
```

- [ ] **Step 2: Create the scratch verification page `src/pages/dev/shell.astro`**

```astro
---
import AppShell from '../../layouts/AppShell.astro';
---

<AppShell title="Shell-förhandsvisning" active="hem" maxWidth={1000}>
  <a slot="rail-context" href="/" class="ctx">Lektion 1.1 (kontext-slot)</a>

  <h1 style="font-family:var(--serif);font-weight:300;font-size:clamp(34px,4vw,46px);letter-spacing:-0.02em;">
    AppShell-förhandsvisning
  </h1>
  <p style="font-family:var(--serif);color:var(--prose);max-width:60ch;">
    Dev-only sida för att verifiera rail (248px), bottenmeny (&lt;760px), tema-toggle
    och dev-toggle. Lägg <code>?unlock=1</code> i URL:en för att visa dev-knappen i
    railen. Tas bort eller ersätts i Fas 2.
  </p>
  <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin-top:24px;">
    <div style="background:var(--surface);border:1px solid var(--border-2);border-radius:14px;padding:20px;">Kort A</div>
    <div style="background:var(--surface);border:1px solid var(--border-2);border-radius:14px;padding:20px;">Kort B</div>
    <div style="background:var(--surface);border:1px solid var(--border-2);border-radius:14px;padding:20px;">Kort C</div>
  </div>

  <style>
    .ctx {
      display: block;
      padding: 10px 12px;
      border-radius: 11px;
      font-family: var(--sans);
      font-size: 13px;
      color: var(--text);
      background: var(--mint-soft);
    }
  </style>
</AppShell>
```

- [ ] **Step 3: Build to verify**

Run: `npm run build`
Expected: build succeeds; `dist/dev/shell/index.html` exists.

- [ ] **Step 4: Manual verification on the dev server**

Run: `npm run dev` then open `http://localhost:4321/dev/shell`.
Expected, confirm each:
- Desktop ≥760px: 248px rail on the left, brand "Ägarboken", LÄRA group (Hem active, Kursöversikt, the context-slot chip), VERKTYG group (Analysverktyg), theme toggle at the bottom; main content offset by the rail.
- Theme toggle flips dark/light and persists across reload (no flash); check `localStorage['agarboken-theme']` is set.
- Add `?unlock=1` → the "DEV: lås upp allt ✓" button appears in the rail; clicking it toggles it off (and it hides). `window.__unlock()` in console re-shows it.
- Narrow the window <760px: rail hides, bottom nav (Hem/Kurs/Verktyg) appears fixed at the bottom; content has bottom padding.

- [ ] **Step 5: Commit**

```bash
git add src/layouts/AppShell.astro src/pages/dev/shell.astro
git commit -m "feat(redesign): AppShell (rail + bottom nav) + dev preview page"
```

---

## Task 7: Phase-0 acceptance verification

**Files:** none (verification only)

- [ ] **Step 1: Full unit-test run**

Run: `npm run test:tools`
Expected: PASS, including `state-core.test.mjs`.

- [ ] **Step 2: Content checks still green (no regression)**

Run: `npm run check`
Expected: `Allt grönt` (or unchanged from before this branch).

- [ ] **Step 3: Production build**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 4: Regression spot-check on the dev server**

Run: `npm run dev`, then verify:
- An existing lesson (e.g. `/kurs/01-investeringsfilosofi-och-tankesatt/1.1-vad-det-innebar-att-aga-en-aktie/`) renders with the new palette/fonts, deck navigation works, "Markera som klar" works, quiz scores.
- The home page `/` renders with the new palette/fonts (still the old layout — unchanged by design).
- Theme persists across both via `agarboken-theme`.

- [ ] **Step 5: Final commit (if any verification tweaks were needed)**

```bash
git add -A
git commit -m "chore(redesign): Phase 0 acceptance verification"
```

---

## Self-review notes (coverage vs spec)

- §3 tokens (exact handoff names + shim) → Task 1.
- §3.2 accent picker values recorded → in spec; implemented Phase 1 (out of scope here).
- §4 fonts → Task 2 Step 1.
- §5 theme key migration + inline init → Task 2 Steps 2–4.
- §6 AppShell/Rail/BottomNav + §6.2 dev toggle → Tasks 5–6.
- §7 state model (streak/last-position/gating/dev-unlock/derived) → Tasks 3–4. (Derived stats: `getStreak` here; completed-count/% reuse `progress.completedCount` in Phase 2.)
- §8 motion: existing `data-reveal` kept; `data-safe` confirmed absent from `src` — no action needed.
- §9 acceptance criteria → Task 7 + Task 6 Step 4.
- §10 deferred (accent picker, routing, font self-hosting) → not in this plan, by design.
