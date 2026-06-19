# CLAUDE.md

Plattform för en svenskspråkig kurs i fundamental aktieanalys. Astro-byggd statisk sajt som renderar markdown-lektioner, deployad till Cloudflare Pages. Detta dokument är till för framtida sessioner: vad som finns, vad som gäller, och vad som är kvar.

---

## Snabbfakta

- **Stack:** Astro 5 (static output), content collections med Zod-schema, View Transitions (ClientRouter). Inga ramverk utöver det. Endast `astro` + `@astrojs/mdx` som beroenden; `playwright` som dev-dep.
- **Deploy:** Cloudflare Pages, projekt `kurs` -> `kurs-7m8.pages.dev`. Deployas med **wrangler** (`wrangler pages deploy`), inte via GitHub-push.
- **Lösenord:** Sajten är lösenordsskyddad i `functions/_middleware.js` (Pages Function). Lösen: `env.SITE_PASSWORD || 'kurs2026'`. Cookie: `kurs_auth`.
- **Aktuell gren:** `trunk` (huvudgren: `main`).
- **Commit-trailer:** avsluta commits med `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`.

---

## Hårda regler (bryt aldrig utan att fråga)

1. **Sifferpolicy.** Uppfinn aldrig finansiella tal för ett namngivet verkligt bolag. Riktiga siffror endast från en användarlevererad verifierad källa (t.ex. `docs/case-sources/fall-lifco-2025.md`). Konstruerade exempel ska markeras illustrativa. Tidskänsliga regler (t.ex. skatt) ges som mekanism, aldrig som fryst tal.
2. **Inga em-dashes (—) och inga en-dashes (–)** i kursmaterialet eller i genererad output. Använd komma, kolon, punkt, eller "till" för intervall. Undantag: matematiskt minus − (U+2212) är medvetet kvar i formelbilagan.
3. **Granska källan, inte bygget.** Lektionskällan ligger i `src/content/kurs/`. `dist/` är byggutdata och skrivs över, redigera aldrig där.
4. **Rör inte den pågående redesignen** (tokens.css, AppShell, ThemeToggle, theme.ts, index.astro, course.ts-gating) utan att användaren ber om det.

---

## Struktur

```
src/
  content/kurs/            115 lektioner i 22 moduler (NN-modulnamn/N.N-lektion.md)
  content.config.ts        Zod-schema för lektioner (frontmatter + quiz)
  lib/course.ts            ordning, träd, grannar, lästid, modul-gating
  pages/kurs/[...slug].astro  deck-spelaren (en lektion -> steg/slides)
  scripts/deck.ts          klient: grupperar H2-sektioner till slides
  layouts/ components/      AppShell, Quiz, LessonHeader, PrevNext, m.fl.
functions/_middleware.js   lösenordsgrind (Cloudflare Pages)
tools/                     innehållsgrindar + skript (se nedan)
docs/                      mallar, style guide, planer, specs, case-källor
content/fundamental-aktieanalys/  NYTT: Fokus-spelarens JSON (se nedan)
```

### Lektionsformat (markdown, nuvarande produkt)
Frontmatter: `del, modul, modulTitel, lektion, titel, niva (Nybörjare/Mellan/Avancerad), ordning, fardighet, format (standard/syntes/referens), quiz[]`. Quiz: `fraga, svar[] (>=2), ratt (number|number[]), forklaring?`. Deck-spelaren delar upp brödtexten i steg per `##`-sektion; `---` är manuell sidbrytning.

---

## Verktyg och grindar

Kör innan leverans:
- `npm run check` -> `tools/check-all.mjs` (integritet, referenser, struktur, dedup).
- `npm run test:tools` -> tester för parsers/grindar.

Strukturgrinden kräver bl.a. 6 H2-sektioner, ordantal 700 till 1600, quiz (>=3 frågor) för standardlektioner, och bannar vissa fraser. Skript i `tools/`: `strip-emdash.mjs`, `strip-endash.mjs`, `export-course.mjs` (-> `KURS-EXPORT.md`, gitignored), `gen-manifest.mjs`. Alla CLI:er använder `pathToFileURL`-guard (Windows-säker huvudmodulkoll).

---

## Status: vad som är gjort

### Plattformen (klar, deployad)
Deck-UI med stegnavigering, lösenordsgrind, quiz med %-resultat, localStorage-progress, mörkt tema som default med toggle, reveal-on-scroll. Modul-gating (`/oversikt` vid låst modul).

### Innehållet (klar) — B+ till A+
Hela omskrivningsplanen (`docs/superpowers/plans/2026-06-18-kurs-bplus-till-aplus.md`) körd: 103 lektioner omskrivna och granskade (varje modul godkänd), capstone ombyggd, ny content (index, WACC, sektor, praktik, Lifco-case), quiz på alla 95 standardlektioner (~379 frågor totalt). Em-dashes och en-dashes borttagna ur allt kursmaterial. Alla grindar gröna.
- **115 lektioner, 22 moduler.** Flaggskeppscase: `src/content/kurs/20-fallstudie-lifco/` (källa: `docs/case-sources/fall-lifco-2025.md`).
- Kanoniska formler: `src/content/kurs/00-referens/formelbilaga.md` (format: referens).

### Redesign (live)
Ny visuell riktning, deployad: tokens med Newsreader/Schibsted/Plex + mint/petrol, AppShell, `/hem` (dashboard), animerad landningssida, `/verktyg` (Ägarboken analysverktyg). Lämna detta ifred om inte ombedd.

### Fokus-spelaren / JSON-stegformat (pågår — två kalibreringslektioner klara)
Brief: `Brief_lektionsinnehall_v2.md`. Mål: transformera verifierade lektioner till ett stegbaserat JSON-format för en "Fokus"-lektionsspelare (steg: intro, reading, concept, dataviz, quiz; inline-datadriven grafik).

**Arkitektur (beslutad):** källan (de 115 .md) förblir sanningen; spelaren är en härledd, kurerad leverans av ~11 lektioner (kap 1-3). En JSON-fil per lektion under `content/fundamental-aktieanalys/`, plus `course.json` (kapitelträd). Spelaren laddar JSON och renderar steg utifrån `typ`-fältet.

**Designmål / facit för renderaren:** `design_handoff_aktieanalys/` (Claude design-agentens high-fidelity-handoff). `Aktieanalys - Lektion (Fokus).dc.html` + `README.md` är spec för utseende och beteende (DC-format, läs som spec, inte kod). Hjältevisualer: `rutnat` (ägar-grid) och `linjediagram` (pris/värde). Quiz-tröskel 80%. Dubbla teman (mörkt "fokus" + ljust "ed") via `localStorage['agarboken-theme']`.

**Gjort:**
- `course.json` — kapitelträd kap 1-3, status `klar`/`kommande` per lektion.
- `1.1-aga-en-aktie.json` + `1.2-pris-mot-varde.json` — **två kalibreringslektioner** (källor: `1.1-*` resp. `1.2-pris-vs-varde.md`). 5 steg vardera, 3 quizfrågor (2 single + 1 multi), `ratt` alltid som lista, dataviz illustrativt-märkt. Dashfria (verifierat). Tillsammans täcker de hela v1-visual-vokabulären: `rutnat`, `linjediagram` (1 serie i 1.1, 2 serier + markör i 1.2), `jamforelse`.
- `RENDERER-BRIEF.md` — kontrakt för renderar-agenten, förankrat i design-handoffen (stegtyper, visual-objektet, quiz, hårda krav, fältnamns-mappning).

**Kvar:**
1. **Renderar-agenten bygger renderaren** mot `RENDERER-BRIEF.md` + 1.1/1.2, i den live-satta designen (inline-SVG per `visual.typ`). Måste återrapportera vilka visual-typer som stöds i v1.
2. **Transformera resten av kap 1-3** (9 lektioner) i samma format, mot bekräftat visual-stöd. Ren innehållstransform. Källmappning enligt briefen.

**Kontraktsbeslut (låsta):** läsbara svenska fältnamn i datan (`typ`/`fraga`/`alternativ`/`ratt`/`forklaring`), inte prototypens terse (`q`/`exp`/`correct`); `ratt` alltid lista; illustrativt-märkning tillåten när verklig data saknas.

**Balans grafik mot text (låst princip):** Innehållet avgör, inte en kvot. En graf förtjänar sin plats bara om den visar en form prosan inte kan (struktur, samband, proportion, förlopp, jämförelse, en överraskande storlek); annars text. `visual` är valfri på concept/dataviz, 3-7 steg. Grafik-tunga lektioner lär ut mekanik (läsa siffror), text-tunga lär ut omdöme och temperament (hur du beter dig); att varva dem är avsikten. Helheten bedöms på tre kontroller: variation (ingen visual-typ dominerar), icke-redundans (två lektioner visualiserar inte samma idé likadant), och **symmetrisk pacing**: vakta BÅDE långa text-rader (t.ex. psykologi) OCH långa grafik-rader (t.ex. räkenskaper kap 4, värdering kap 9), de senare ger graf-trötthet. Andningspausen i en grafik-svit är ett reading- eller concept-steg som kliver tillbaka till omdömet (vad säger siffran för dig), aldrig en pliktgraf inkilad bara för att bryta av. Projicerad fördelning ~28 grafik / ~21 text är ett utfall, inte ett mål: går en lektion tvärtemot projektionen vid transformen, följ lektionen.

---

## Att notera (ej åtgärdas om inte ombedd)
- Ingen konsolideringspass kördes; kursen växte till ~115 lektioner / 22 moduler.
- Användarens egen `Ägarboken - Startsida (standalone).html` innehåller fortfarande några em-dashes (lämnat till användaren).
- `KURS-EXPORT.md` och `src/content/kurs.zip` är artefakter, inte källa.
