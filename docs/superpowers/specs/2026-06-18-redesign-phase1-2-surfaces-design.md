# Redesign Phases 1–2 — Visible Surfaces (autonomous build)

**Date:** 2026-06-18
**Status:** Autonomous — owner delegated all decisions ("just do the stuff you ask about") to finish overnight. Decisions recorded here for morning review.
**Builds on:** Phase 0 foundation (tokens, fonts, theme, AppShell/Rail/BottomNav, state.ts/state-core.mjs).

## Goal

Make the real site look like the handoff: rebuild the lesson player, add the course overview (timeline + gating), the dashboard, the animated landing page, and wire real routing — all on branch `redesign/phase-0-foundation`.

## Routing (decided)

| Path | Surface | Layout |
|---|---|---|
| `/` | Landing (animated marketing) | own marketing chrome (no app rail) |
| `/hem` | Dashboard | AppShell active="hem" |
| `/oversikt` | Course overview (chapter timeline + gating) | AppShell active="kurs" |
| `/kurs/<slug>` | Lesson player (deck) | AppShell-based lesson chrome, active="lektion" |
| `/verktyg` | Analysverktyg (existing tool) | serve existing `agarboken.html` (self-themed) |

- Rail/BottomNav `ROUTES` updated to `{ hem:'/hem', kurs:'/oversikt', verktyg:'/verktyg' }`; brand → `/hem`.
- Old `src/pages/index.astro` (course-overview hero) is **replaced** by the Landing; its overview role moves to `/oversikt`.
- `/dev/shell` removed at the end (real surfaces supersede it).
- Lesson links everywhere use existing `lessonHref` (`/kurs/<id>/`).

## Gating (decided)

- `computeGate` (Phase 0) drives module lock state on `/oversikt`.
- **Enforcement on lesson pages:** a small client script checks the lesson's module gate; if locked AND not dev-unlocked, redirect to `/oversikt`. (Static site → client-side enforcement; acceptable, behind password gate.)
- Dev bypass: `?unlock=1` / rail dev toggle / `window.__unlock()` (Phase 0) — owner can see everything.
- Module order + lesson-id arrays are emitted as JSON from the course tree where needed (overview, lesson guard).

## State wiring (decided)

- Add `getResumeTarget()` wrapper in `state.ts` over the pure `resumeTarget` (Phase 0 left this for Phase 2): injects meta + done-set + gate computed from the embedded course tree.
- Deck calls `recordPosition(lessonId, step)` on each step change → powers dashboard "Fortsätt där du slutade" + streak.
- `MarkComplete` already writes `done`; dashboard/overview read it for stats/gating.

## Lesson player (Phase 1, decided)

Rebuild `LessonLayout` to use the new chrome (compact rail, not the 94-item tree):
- **Rail context slot** (per lesson): current "Lektion X.X" active item + a "LEKTIONENS STEG" mini progress at the rail bottom.
- **Topbar:** breadcrumb (Hem › Kapitel N › Lektion X.X) + clickable step-dots + step counter "NN / NN".
- **Content:** centered single step at a time (keep `deck.ts` `##`=step logic; restyle).
- **Step styles (generic, markdown-driven):**
  - intro/title step → centered kicker + big Newsreader display title + ingress.
  - prose steps → editorial measure; **blockquote (`>`) renders as the "TA MED DIG" takeaway** (border-left mint).
  - first-paragraph lead may use a mint highlight on `**bold**`/`<strong>` spans (light touch).
- **Nav:** primary dark-pill "Fortsätt →" / "Slutför lektionen" (last step) / secondary "← Tillbaka"; arrow keys; end-of-deck advances to next lesson (existing behavior).
- **Quiz:** restyle to editorial (radio/check markers, "Rätta svar", score + explanations, "Gör om").
- **Bespoke steps NOT forced:** the handoff's 28-cell ownership grid and the price-vs-value SVG are made **optional MDX components** (`<OwnershipGrid/>`, `<PriceValueChart/>`) available to authors, used only where present — not generated for all 94 lessons.
- Retire full-tree `Sidebar.astro` from the lesson view (kept in repo; `/oversikt` is the navigator).

## Course overview `/oversikt` (Phase 2, decided)

- AppShell; breadcrumb (Hem › Kursöversikt); course title + ingress; total progress bar + "N/M lektioner".
- **Vertical chapter timeline:** numbered nodes on a 1px line; each module = card. Module states from `computeGate`: done (mint node + check), unlocked/active (mint node), locked (reduced opacity + lock glyph). Open/active module lists its lessons with status markers (done check / next / locked) + time + CTA ("Repetera"/"Börja →"). Locked modules show titles/time but lessons are not linked (unless dev-unlock).
- Reuses `getCourseTree()`; groups by Del → Modul.

## Dashboard `/hem` (Phase 2, decided)

- AppShell active="hem". Header: time-based greeting (Newsreader 300) + date (sv-SE) + streak chip ("{n} dagars svit").
- "Fortsätt där du slutade" card → resume target (title/meta/progress + circular mint arrow button).
- Stats row (3): lektioner klara, % av kursen, dagars svit.
- "Analysera ett bolag" card → `/verktyg` (border-top mint).
- "Härnäst" row: next lesson + "Se hela kursen" → `/oversikt`.
- All numbers real from `progress` + `state` (client-painted; SSR shows sensible zero-state).

## Landing `/` (Phase 2, decided)

- Rebuild from `Ägarboken - Startsida (standalone).html` structure: marketing topbar (brand + "Till plattformen" → /hem, "Se kursinnehållet" → /oversikt), hero, "Hur det fungerar", "Kursinnehåll" (3 chapters), "Verktyget", slut-CTA ("Din första lektion väntar" → first lesson / /hem).
- **Animated scroll-in** via existing `data-reveal` IntersectionObserver + staggered rise; respects reduced-motion.
- Behind the existing password gate (no middleware change).

## Analysverktyg `/verktyg` (decided)

- Lowest priority (already works standalone at `/agarboken.html`). Ensure it's reachable at `/verktyg`: copy/serve the existing tool so the rail link resolves. It self-themes via `data-theme` + the shared `agarboken-theme` key. Full Astro componentization deferred.

## Out of scope / explicit cuts (for morning awareness)

- Per-lesson bespoke graphics beyond the two optional MDX components.
- Accent picker (Mint/Blå/Amber) — still deferred.
- Server-side gating (stays client-side).
- Deep refactor of the analysis tool into Astro components.

## Verification

Per surface: `npm run build` green, page renders (HTTP 200, no error overlay), key markers present. End: full `npm run test:tools`, `npm run check`, `npm run build`, and a click-through of `/`, `/hem`, `/oversikt`, a lesson, `/verktyg` on the dev server.
