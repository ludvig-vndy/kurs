# Designspec: Kursplattform för fundamental aktieanalys

Datum: 2026-06-17
Status: Godkänd (öppna frågor besvarade av användaren)

## Mål

Statisk, premium kurssajt för en fundamental aktieanalyskurs (svenska). Allt
innehåll är markdown, en fil per lektion. Sidebar, navigering och progress
genereras automatiskt från innehållet. Att lägga till en lektion = lägga en
`.md`-fil i rätt mapp. Hostas på Cloudflare Pages.

Utöver grundbriefen ska plattformen kännas dyr och vara en angenäm
inlärningsupplevelse: lugna premium-transitions, läsprogress per lektion,
quiz med poäng (% rätt), och smakfull (icke-skrikig) progress-feedback.

## Beslut

- **Stack:** Astro (static output) + content collections + Zod-schema. MDX
  aktiverat (ren markdown fungerar oförändrat).
- **Quiz-författande:** via `quiz:`-fält i frontmattern (datadrivet, ingen
  MDX-kunskap krävs). Renderas som poängsatt slutquiz.
- **Accent:** djup teal (`#0F6E5C`-familjen), dämpad i mörkt läge. Grön/röd
  reserveras enbart för quiz rätt/fel.
- **Tema:** mörkt läge som default + diskret toggle, val sparas i localStorage.

## Arkitektur

```
src/
  content/
    config.ts            # collection-schema (frontmatter + quiz)
    kurs/NN-modul/lektion.md
  lib/course.ts          # bygg träd Del→Modul→Lektion, platta ut ordning,
                         # reading time, prev/next, helpers
  styles/tokens.css      # färg/typ/spacing/motion-tokens (light+dark)
  styles/global.css      # bas, prose, callouts, layout
  layouts/LessonLayout.astro
  components/
    Sidebar.astro        # Del→Modul→Lektion, hopfällbar, current, bockar, ringar
    ReadingProgress.astro
    LessonHeader.astro    # titel + niva-badge + fardighet-ruta + reading time
    Breadcrumb.astro
    PrevNext.astro
    Quiz.astro            # poängsatt quiz från frontmatter
    MarkComplete.astro
    ThemeToggle.astro
  scripts/progress.ts     # localStorage: klarmarkering + quiz-resultat
  scripts/theme.ts        # tema-init (no-flash) + toggle
  pages/
    index.astro          # kurshem: total-%, moduler, fortsätt-knapp
    kurs/[...slug].astro  # lektionsrutt (genererad)
```

## Innehållsmodell

Mappstruktur enligt brief: `src/content/kurs/NN-modul/L.L-slug.md`.

Frontmatter-schema (Zod):

- `del: string` — en av de sex delarna
- `modul: number`
- `modulTitel: string`
- `lektion: string` — för visning, t.ex. "1.1"
- `titel: string`
- `niva: "Nybörjare" | "Mellan" | "Avancerad"`
- `ordning: number` — global sortering (modul*100 + index)
- `fardighet: string`
- `quiz?: Array<{ fraga, svar: string[], ratt: number | number[], forklaring }>`
  — valfritt. `ratt` som number = single-choice (radio); array = multi-select.

Body = ren markdown. Sektioner aldrig hårdkodade. `- [ ]`-listor renderas som
självskattning (ej poängsatt). Reading time beräknas från ordantal.

## UI/UX (informerat av research)

Läsning: serif brödtext ~19–20px, `max-width: 65ch`, line-height 1.55; sans för
UI/rubriker; tabulära siffror. Varmt papper (ljust) / near-black (mörkt), aldrig
#000/#fff. Callout/definitions-rutor.

Navigation: persistent sidebar, hopfällbara moduler, auto-expandera aktuell,
tydlig current-markering. Per-lektion bock, modul-ring "N av M", total-% överst.
Prev/Next med riktiga titlar. Tangentbord: ←/→ lektion, `[` fäll sidebar. Mobil:
fokus-trappad hamburger-drawer.

Progress: tunn läsprogress-bar scopad till brödtext (100% vid textslut).
"Markera som klar" per lektion → bock i sidebar (localStorage).

Quiz: radio (single) / checkbox (multi, märkt "Välj alla som stämmer"). Omedelbar
feedback (ikon+färg+text), alltid "Varför?"-förklaring. "X % rätt", ≥80% godkänt,
"Försök igen". Mjuk pop på rätt, mild shake på fel. Full ARIA (radiogroup,
live region) + tangentbord.

Motion: 150ms mikro / 250ms komponenter, `ease-out` in; View Transitions mellan
lektioner (~220ms). Allt bakom `prefers-reduced-motion`.

Reveal-on-scroll: brödtextblock, rubriker, bilder, figurer och grafer fadar +
glider in mjukt (translateY ~12px → 0, opacity 0 → 1, ~500ms ease-out, lätt
stagger) första gången de når viewporten, via IntersectionObserver. Subtilt och
en gång per element — inte studsigt, inte upprepat vid återscroll. Helt avstängt
under `prefers-reduced-motion` (allt syns direkt utan transform).

## Deploy

Cloudflare Pages. Build command `npm run build`, output `dist/`. Dokumenteras i
README.

## Out of scope (per brief)

Inget lektionsinnehåll skrivs. Inga hårdkodade sektionsrubriker. Ingen
inloggning/betalning.
