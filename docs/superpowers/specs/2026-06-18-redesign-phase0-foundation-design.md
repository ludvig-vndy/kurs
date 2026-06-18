# Redesign — Phase 0: Foundation & State

**Date:** 2026-06-18
**Status:** Approved (brainstorm) — ready for implementation planning
**Scope:** Phase 0 of a multi-phase redesign of the course site to the "Ägarboken" design handoff.

---

## 1. Project context (cross-phase)

We are rebuilding the front-end of the existing Astro course site
(`kurs`, ~94 markdown lessons, hosted on Cloudflare Pages behind a password
gate) to match the **Ägarboken design handoff**
(`design_handoff_aktieanalys/` + two root standalone HTML files).

### Surfaces (5)

1. **Landing** (`/`) — public marketing front door (brand "Ägarboken", hero,
   "Hur det fungerar", Kursinnehåll, Verktyget, Slut-CTA). Animated scroll-in.
   Source: `Ägarboken - Startsida (standalone).html`.
2. **Dashboard** — greeting, streak chip, "fortsätt där du slutade", stats row,
   "analysera ett bolag". Source: `Aktieanalys - Plattform.dc.html` (view `dashboard`).
3. **Course Overview** — vertical chapter timeline with gating/locks; the map
   used to navigate between lessons. Source: same file (view `course`).
4. **Lesson player "Fokus"** — step-by-step deck, 248px rail, pris-vs-värde SVG,
   quiz. Source: `Aktieanalys - Lektion (Fokus).dc.html`.
5. **Analysis tool "Ägarboken"** — standalone checklist tool, integrated as an
   Astro route. Source: `Ägarboken - Analysverktyg.html` / root `agarboken-analysverktyg.html`.

### Global decisions

- **Fidelity:** pixel-faithful recreation in our Astro architecture, reusing the
  existing content collection, deck, progress and quiz logic underneath.
- **State:** fully real — streak, "continue where you left off", stats,
  completion — persisted in `localStorage` (per browser, no accounts).
- **Gating:** **hard gating** — a module unlocks when the previous module's
  lessons are all complete (module 1 always open). Plus a **dev bypass** so the
  owner can see everything during development.
- **Navigation:** short rail (Hem · Kursöversikt · Analysverktyg + current-lesson
  context). The full 94-lesson list is **not** in the rail; lesson-to-lesson
  navigation goes through the Course Overview map. (Deliberate, per handoff.)
- **Theme:** single shared theme across all surfaces via the `localStorage` key
  **`agarboken-theme`** (`light` | `dark`), **dark default**.
- **Gate:** the entire site (landing included) stays behind the existing
  password gate. No middleware changes in this work.

### Phase roadmap

- **Phase 0 — Foundation & state** (this spec).
- **Phase 1 — Lesson player "Fokus".**
- **Phase 2 — Platform:** Landing (`/`) + Dashboard + Course Overview + routing
  reorganisation.
- **Phase 3 — Analysis tool** as an Astro route.

Each phase gets its own spec → plan → implementation, building on this one.

---

## 2. Phase 0 goals & non-goals

**Goal:** establish the shared substrate every later phase composes on — the
design tokens, fonts, theme system, app chrome, the state/gating model, and
motion — without breaking the currently-working site.

**In scope:**

- New design tokens (revalue + extend `tokens.css`).
- New font stack (Newsreader / Schibsted Grotesk / IBM Plex Mono).
- Theme key migration to `agarboken-theme`.
- A shared `AppShell.astro` (248px rail + mobile bottom nav) — built and usable,
  but not yet wired as the home page.
- State model: extend `progress.ts`; add `state.ts` (last position, streak,
  gating, dev-unlock, derived stats); add a visible dev toggle.
- Motion: keep the existing reveal-on-scroll; drop the prototype `data-safe` hack.

**Out of scope (later phases):** the dashboard, course overview, landing,
lesson-player restyle, analysis-tool route, routing changes, the dark-only accent
picker (Mint/Blå/Amber — deferred to Phase 1).

**Constraint:** the site must keep building and working after Phase 0. Existing
pages (`index.astro`, lessons via `LessonLayout`) keep rendering — they simply
inherit the revalued tokens/fonts. No page is migrated to `AppShell` in Phase 0.

---

## 3. Design tokens (`src/styles/tokens.css`)

Keep the existing **semantic names** so existing components adopt the new look
with zero markup change, **revalue** them to the handoff palette, and **add** the
extra tokens later phases need.

### Dark (default — handoff "fokus")

| Token | Value |
|---|---|
| `--bg` | `#0A0C0B` |
| `--surface` / panel | `#11140F` |
| `--surface-2` | `#161A14` |
| `--text` | `#F0EDE4` |
| `--text-soft` (new) | `#C3C7BC` |
| `--text-muted` | `#777F73` |
| `--text-faint` | `#333A32` |
| `--accent` (mint) | `#8FD3B0` |
| `--accent-hover` / accent-2 | `#A6E0C4` |
| `--accent-contrast` (on-mint) | `#0A0C0B` |
| `--accent-soft` | `rgba(143,211,176,.13)` |
| `--accent-line` | `rgba(143,211,176,.45)` |
| `--border` | `rgba(255,255,255,.09)` |
| `--border-2` (new) | `rgba(255,255,255,.16)` |
| `--brass` (new) | `#C9A86A` |
| `--good` / `--mid` / `--bad` (new) | `#8FD3B0` / `#E3C06A` / `#E0896F` |
| `--line-price` (new) | dashed price line, ~`#777F73` |

### Light (editorial — handoff "ed")

| Token | Value |
|---|---|
| `--bg` | `#EFE9DC` |
| `--surface` | `#F7F2E7` |
| `--surface-2` | `#FCFAF3` |
| `--text` | `#1E241F` |
| `--text-soft` | `#3C4239` |
| `--text-muted` | `#6E7568` |
| `--text-faint` | `#CBC3B2` |
| `--accent` | `#1C6E50` |
| `--accent-contrast` | `#F6F3EA` |
| `--border` / `--border-2` | `rgba(30,36,31,.14)` / `.24` |
| `--brass` | `#9A6E1C` |
| `--good`/`--mid`/`--bad` | `#3E7A4F` / `#9A7320` / `#A8473A` |

Existing quiz semantic colors (`--ok*`, `--err*`) are kept, retuned to
`--good`/`--bad` where it reads better.

### Typography, form, motion

- `--font-serif: "Newsreader", Georgia, serif;` (300/400/500 + italic 400)
- `--font-sans: "Schibsted Grotesk", system-ui, sans-serif;` (400/500/600)
- `--font-mono: "IBM Plex Mono", ui-monospace, monospace;` (400/500/600) — new
- Display = Newsreader 300 + `letter-spacing:-.02em`. Body prose ~20px / lh ~1.7
  (keep a `--prose-size` knob, defaults 20px). Kickers 10–11px, uppercase,
  letter-spacing .14–.28em.
- Radii: `--radius-sm:6px`, `--radius-md:10px`, card `14–18px`, `--radius-full:99px`.
- `--rail-width: 248px`. Per-surface max-widths used later: dash 1000 / course
  880 / tool 1160 / lesson prose ~65ch.
- **Breakpoint: 760px** (rename/realign from the current 900px shell breakpoint
  in `AppShell`; existing `LessonLayout` keeps its own until Phase 1).
- Mint-glow shadow token for primary circular buttons:
  `--glow-mint: 0 8px 22px -6px var(--accent)`.
- Motion vars unchanged (`--ease-out`, durations); add a `riseF`-equivalent
  entrance handled by the existing reveal system (§7).

---

## 4. Fonts (`src/layouts/BaseLayout.astro`)

Replace the Google Fonts `<link>` (Inter + Source Serif 4) with:

```
Newsreader: wght 300;400;500 + ital 400
Schibsted Grotesk: wght 400;500;600
IBM Plex Mono: wght 400;500;600
```

`display=swap`, `preconnect` kept. (Self-hosting is a later optimisation; the
handoff's standalone files inline the fonts, we don't need to.)

---

## 5. Theme (`src/scripts/theme.ts` + inline init)

- Change `KEY` from `kurs:theme` to **`agarboken-theme`**.
- Values `light` | `dark`; **dark default**; attribute `data-theme` on `<html>`
  (unchanged mechanism). We standardise on `light`/`dark` attribute values
  (not the handoff's internal `fokus`/`ed`).
- One-time **migration**: if `agarboken-theme` is absent but the old `kurs:theme`
  exists, adopt and re-persist it under the new key.
- Update the inline no-flash `<head>` script in `BaseLayout` to read
  `agarboken-theme` (with the old-key fallback) before paint.
- Result: theme is shared across every surface, including the Phase 3 analysis
  tool route, matching the handoff's documented behavior.

---

## 6. Shared app chrome — `src/layouts/AppShell.astro` + `src/components/Rail.astro`

A new layout providing the handoff chrome. Built in Phase 0, consumed from
Phase 1 onward. **No existing page is switched to it in Phase 0.**

### Structure

- **Desktop (≥760px):** fixed **248px left rail**:
  - Brand (mint square mark + "Ägarboken"/wordmark) → links to dashboard route
    (the route is created in Phase 2; until then link to `/`).
  - **LÄRA** section: Hem, Kursöversikt + a **context slot** (`<slot name="rail-context"/>`)
    for per-page items (e.g. current lesson, step-progress).
  - **VERKTYG** section: Analysverktyg.
  - Bottom area: **theme toggle** + profile row + **dev toggle** (§6.2).
  - Rail nav items render **active state** and **gating-aware lock** markers
    (a lock glyph when the target is locked and dev-unlock is off).
- **Mobile (<760px):** rail hidden; **fixed bottom nav** (Hem / Kurs / Verktyg /
  theme). Content gets bottom padding to clear it.
- Main content: `<slot/>`, scroll container, with a per-surface max-width set by
  the consuming page.

### 6.1 Interface

`AppShell` props: `title`, `active` (`'hem' | 'kurs' | 'verktyg' | 'lektion'`),
`maxWidth?`. Named slot `rail-context`. The rail is a separate `Rail.astro`
component (testable/understandable in isolation); `AppShell` composes rail +
bottom nav + main.

The full course-tree `Sidebar.astro` is **retired from the global chrome**; its
tree-building logic is reused inside the Course Overview page in Phase 2. (The
file stays until then so `LessonLayout` keeps working.)

### 6.2 Dev toggle (visible)

- Gating is bypassed when `localStorage['kurs:dev-unlock'] === '1'`.
- Toggling: `?unlock=1` / `?unlock=0` query params (persisted to localStorage on
  load), and a `window.__unlock(on?)` console helper.
- **Visible control:** when dev-unlock is active, the rail bottom area (and the
  mobile bottom nav overflow) shows a small "DEV: lås upp allt ✓" toggle so the
  owner can flip gating from the UI. Hidden entirely for normal learners (only
  appears once unlock has been enabled at least once).

---

## 7. State model (`src/scripts/progress.ts` + new `src/scripts/state.ts`)

Per-lesson progress stays in `progress.ts` (`{done, quizPct}`, key
`kurs:progress:v1`) — unchanged API.

New `state.ts`, key `kurs:meta:v1`, shape:

```ts
interface CourseMeta {
  lastLessonId?: string;   // "continue where you left off"
  lastStep?: number;       // deck step index within that lesson
  streakCount?: number;    // consecutive active days
  streakLastDay?: string;  // YYYY-MM-DD of last activity (local)
}
```

API:

- `recordPosition(lessonId, step)` — called by the deck on navigation; updates
  `lastLessonId/lastStep` and bumps the streak (see below).
- `touchStreak()` — if `streakLastDay` is today → no-op; if yesterday → `count+1`;
  if older/absent → reset to 1. Stamps `streakLastDay`. Dispatches a change event.
- `getStreak(): number`, `getResumeTarget(orderedLessons): {lessonId, step} | null`
  — last position, else first unlocked incomplete lesson.
- **Gating** (`gating.ts` or part of `state.ts`):
  `computeGate(modulesInOrder)` where each module carries its ordered lesson-id
  array (embedded as JSON on the page that needs it). Returns per-module
  `locked | unlocked | done` and the "next" lesson. A module is `unlocked` iff the
  previous module is fully `done` (all non-referens lessons done) **or**
  `kurs:dev-unlock==='1'`. Module 1 always unlocked.
- `isDevUnlocked()`, `setDevUnlock(on)`, plus the `?unlock` / `window.__unlock`
  wiring from §6.2.
- **Derived stats** for the dashboard: completed count, % complete, streak — thin
  helpers over `progress.ts` + tree data. (Consumed in Phase 2; defined here so
  the API is stable.)

All reads/writes are `localStorage`-guarded (private mode / SSR safe) and emit a
change event (reuse `PROGRESS_EVENT` or a sibling) so surfaces repaint live.

**Stated limitation:** progress and gating are client-side per browser; a
determined user could bypass gating via devtools. Acceptable because the whole
site is already behind the server-side password gate.

---

## 8. Motion

- Keep the existing `data-reveal` IntersectionObserver entrance in `BaseLayout`
  (rise + fade, staggered via `data-reveal-delay`, respects
  `prefers-reduced-motion`). It already matches the handoff `riseF` feel and will
  drive the **animated landing page** scroll-ins in Phase 2.
- **Remove** the prototype `data-safe` forced-visibility timer hack (not needed —
  we use real CSS/IO entrance).

---

## 9. Acceptance criteria (Phase 0)

1. `npm run build` succeeds; existing pages render with the new palette and fonts.
2. Toggling theme persists under `agarboken-theme`; an existing `kurs:theme`
   value is migrated once; no theme flash on load.
3. `AppShell` + `Rail` render a 248px rail on desktop and a bottom nav under
   760px, with working theme toggle and active states (verified on a scratch
   route or Storybook-style preview page; not wired to `/` yet).
4. `state.ts` unit-style checks: streak increments across day boundaries and
   resets on a gap; gating locks module N until N-1 is complete; dev-unlock via
   `?unlock=1`, `window.__unlock()`, and the visible toggle all flip gating; the
   visible dev toggle is absent for a fresh (never-unlocked) user.
5. No regression: lessons still navigate, mark-complete still works, quiz still
   scores.

---

## 10. Open items deferred (not blocking Phase 0)

- Accent picker (Mint/Blå/Amber, dark-only) → Phase 1.
- Routing reorganisation (`/` = landing, dashboard/overview routes) → Phase 2.
- Self-hosting fonts → optional later optimisation.
