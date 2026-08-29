# CLAUDE.md

Plattform för en svenskspråkig kurs i fundamental aktieanalys. Astro-byggd statisk sajt som renderar markdown-lektioner, deployad till Cloudflare Pages. Detta dokument är till för framtida sessioner: vad som finns, vad som gäller, och vad som är kvar.

---

## Snabbfakta

- **Stack:** Astro 5 (static output), content collections med Zod-schema, View Transitions (ClientRouter). Inga ramverk utöver det. Endast `astro` + `@astrojs/mdx` som beroenden; `playwright` som dev-dep.
- **Deploy:** Cloudflare Pages, två projekt från samma bygge: `kurs` -> `kurs-7m8.pages.dev` (Delägaren) och `motparten` -> `motparten.pages.dev` (säljkursen). Deployas med **wrangler** (`wrangler pages deploy --branch=main`, utan flaggan blir det preview), inte via GitHub-push.
- **Åtkomst:** Sajten är kontogrindad i `functions/_middleware.js` (Pages Function): middleware verifierar en inloggad Supabase-session (`da_session`-cookie, access-token JWT) mot Supabases JWKS (ES256) på edgen. Publika undantag: landning (`/`), `/logga-in`, inbjudan, statiska tillgångar, `/api/*`. Det gamla sajtlösenordet (`kurs2026`/`kurs_auth`) är borttaget (2026-07-11).
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
  content/kurs/            127 lektioner i 24 moduler (NN-modulnamn/N.N-lektion.md)
  content.config.ts        Zod-schema för lektioner (frontmatter + quiz)
  lib/course.ts            ordning, träd, grannar, lästid, modul-gating
  pages/kurs/[...slug].astro  deck-spelaren (en lektion -> steg/slides)
  scripts/deck.ts          klient: grupperar H2-sektioner till slides
  layouts/ components/      AppShell, Quiz, LessonHeader, PrevNext, m.fl.
functions/_middleware.js   kontogrind: verifierar Supabase-JWT (Cloudflare Pages)
tools/                     innehållsgrindar + skript (se nedan)
docs/                      mallar, style guide, planer, specs, case-källor
content/fundamental-aktieanalys/  Fokus-spelarens JSON (se nedan)
content/motparten/         Säljkursen Motparten, samma JSON-format (se nedan)
src/lib/kurs.mjs           kursregistret: var varje kurs bor, vad den heter
src/components/kurs/       delade sidkroppar (KursOversikt, KapitelSida, Spelare)
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
Deck-UI med stegnavigering, kontogrind (Supabase-inloggning), quiz med %-resultat, localStorage-progress, mörkt tema som default med toggle, reveal-on-scroll. Modul-gating (`/oversikt` vid låst modul).

### Innehållet (klar) — B+ till A+
Hela omskrivningsplanen (`docs/superpowers/plans/2026-06-18-kurs-bplus-till-aplus.md`) körd: 103 lektioner omskrivna och granskade (varje modul godkänd), capstone ombyggd, ny content (index, WACC, sektor, praktik, Lifco-case), quiz på alla 95 standardlektioner (~379 frågor totalt). Em-dashes och en-dashes borttagna ur allt kursmaterial. Alla grindar gröna.
- **127 lektioner, 24 moduler** (modul 23, Att äga ett förhoppningsbolag, tillagd 2026-07-07: casetrappan, avtalsspråket, kallelsen/utspädningen, löftesliggaren, hålla/släppa). Flaggskeppscase: `src/content/kurs/20-fallstudie-lifco/` (källa: `docs/case-sources/fall-lifco-2025.md`).
- **Modul 24, Girighet och att säkra avkastning, tillagd 2026-07-08** (6 lektioner: girigheten kostar, önsketänkande, den paraboliska uppgången, scenariojämförelsen, säkra eller stretcha, syntes). Spec/plan: `docs/superpowers/specs/2026-07-08-modul-24-girighet-design.md`, `docs/superpowers/plans/2026-07-08-modul-24-girighet.md`. Namngivet Sivers-case i 24.3 (daterade tal, källa: `docs/case-sources/sivers-2026.md`). Verktygsskiss (ej byggd): `docs/specs/verktyg-sakra-eller-stretcha.md`.
- Kanoniska formler: `src/content/kurs/00-referens/formelbilaga.md` (format: referens).

### Design (live): "Marginalen" broadsheet
Sajten heter **Marginalen** och kör en broadsheet-look (Outfit display/Spectral brödtext/Schibsted Grotesk etiketter (självvärd, ersatte Inter 2026-07-12), JetBrains Mono endast för tabellsiffror; papper + oxblod/guld; typspår A beslutat 2026-07-08), som ersatte den tidigare mint/petrol-redesignen. Ytor: `/` (startsida), `/hem` (dashboard), `/fokus` + `/fokus/kapitel/[nr]` + `/fokus/[lektion]` (Fokus-spelaren), `/verktyg` (Marginalen analysverktyg). Delat stilark `src/styles/broadsheet.css` + layout `src/layouts/Broadsheet.astro` (masthead) och den ljusa enda temat. Textkursen (`/oversikt`, `/kurs/*`) ligger kvar på `tokens.css`/AppShell (mint, mörkt/ljust-toggle). Tidigare namn: Ägarboken.

### Fokus-spelaren / JSON-stegformat (innehåll klart — 62 lektioner i 18 kapitel)
Brief: `Brief_lektionsinnehall_v2.md`. Plan: `docs/superpowers/plans/2026-06-19-fokus-full-course.md`. Mål: transformera verifierade lektioner till ett stegbaserat JSON-format för en "Fokus"-lektionsspelare (steg: intro, reading, concept, dataviz, quiz; inline-datadriven grafik).

**Arkitektur (beslutad):** källan (de 121 .md) förblir sanningen; spelaren är en härledd leverans i `content/fundamental-aktieanalys/`, en JSON-fil per lektion + `course.json` (kapitelträd). Spelaren laddar JSON och renderar steg utifrån `typ`-fältet. Numreringen är spelarens egen (skiljer sig från huvudkursens); de ursprungliga 11 omnumrerades in i kursordningen.

**Designmål / facit för renderaren:** `design_handoff_aktieanalys/` (Claude design-agentens high-fidelity-handoff). `Aktieanalys - Lektion (Fokus).dc.html` + `README.md` är spec för utseende och beteende (DC-format, läs som spec, inte kod). Hjältevisualer: `rutnat` (ägar-grid) och `linjediagram` (pris/värde). Quiz-tröskel 80%. Dubbla teman (mörkt "fokus" + ljust "ed") via `localStorage['agarboken-theme']`.

**Gjort:**
- **Alla 62 lektioner i 18 kapitel producerade**, status `klar` i `course.json`. Sex visual-typer (`rutnat`, `linjediagram`, `jamforelse`, `stapeldiagram`, `flode`, `andel`). Flaggskeppscase 14.1 Lifco på riktiga daterade FY2025-tal. Kapitel 17 (modul 23) och kapitel 18 (modul 24, girighet) tillagda 2026-07; 18.3 använder Sivers FY2025-tal (källa: `docs/case-sources/sivers-2026.md`).
- **Slutpass kört:** helhets-kontroll (variation, icke-redundans, symmetrisk pacing); jamforelse-frekvensen granskad (mestadels befogade skarpa kontraster, behållna), 6.1 gjord till text-concept (sträckt 5-element-form), 5.3 trimmad (dubbel stapel borttagen), diakriter återställda i 6.1/15.2/11.3.
- `RENDERER-BRIEF.md` — kontrakt för renderar-agenten. `tools/check-fokus.mjs` — grind (ingår i `npm run check`); alla 51 gröna, dashfria.

**Kvar (renderar-agentens del):** wira `/fokus`-översikten mot `course.json`, verifiera att alla sex visual-typer ritar rätt på hela datan (särskilt `andel`, `flode`, `jamforelse`), deploya.

**Kontraktsbeslut (låsta):** läsbara svenska fältnamn i datan (`typ`/`fraga`/`alternativ`/`ratt`/`forklaring`), inte prototypens terse (`q`/`exp`/`correct`); `ratt` alltid lista; illustrativt-märkning tillåten när verklig data saknas.

**Balans grafik mot text (låst princip):** Innehållet avgör, inte en kvot. En graf förtjänar sin plats bara om den visar en form prosan inte kan (struktur, samband, proportion, förlopp, jämförelse, en överraskande storlek); annars text. `visual` är valfri på concept/dataviz, 3-7 steg. Grafik-tunga lektioner lär ut mekanik (läsa siffror), text-tunga lär ut omdöme och temperament (hur du beter dig); att varva dem är avsikten. Helheten bedöms på tre kontroller: variation (ingen visual-typ dominerar), icke-redundans (två lektioner visualiserar inte samma idé likadant), och **symmetrisk pacing**: vakta BÅDE långa text-rader (t.ex. psykologi) OCH långa grafik-rader (t.ex. räkenskaper kap 4, värdering kap 9), de senare ger graf-trötthet. Andningspausen i en grafik-svit är ett reading- eller concept-steg som kliver tillbaka till omdömet (vad säger siffran för dig), aldrig en pliktgraf inkilad bara för att bryta av. Projicerad fördelning ~28 grafik / ~21 text är ett utfall, inte ett mål: går en lektion tvärtemot projektionen vid transformen, följ lektionen.

---

### Motparten: säljkurs, andra benet (2026-08)

Egen produkt på samma plattform och i samma bygge, egen URL. 12 kapitel, 42 lektioner,
259 steg, i Fokus-spelarens JSON-format under `content/motparten/`. Sebastian Berg är
ämnesförankringen, Ludvig och han är piloter.

- **Kursmotorn är generaliserad.** `src/lib/kurs.mjs` är enda stället som vet var en kurs
  bor (katalog, ordlista, varumärke, navigation, korslänkar). Sidkropparna ligger i
  `src/components/kurs/` och delas av båda kurserna, rutterna är tunna skal. Aktiekursen
  ska rendera oförändrat efter varje ändring i motorn. Kontrollera med
  `node tools/dist-hash.mjs`, som normaliserar bort Astros asset-namn och scope-id:n
  (de flyttar utan att något syns på sidan) och jämför DOM och CSS var för sig.
- **Evidenspolicy, säljkursens motsvarighet till sifferpolicyn.** Varje påstående som
  låter som forskning ska ha `evidens: { niva, kalla }` mot
  `docs/kallor/motparten-kallregister.md`. A robust, B omtvistad, C hantverk utan
  forskningsstöd. Registret har också en röd lista (R1 till R7) med det som inte håller:
  Mehrabian 7-38-55, NLP och spegling, DISC och MBTI, leverantörsdata som forskning.
  Röd-listat får bara nämnas i ett `myt`-steg, aldrig i påstående-form. Grinden fäller
  A eller B utan källa, C med källa, och röda fraser utanför myt-steg.
- **Språkregel:** etablerade engelska facktermer skrivs på engelska, inte i påhittad
  svensk översättning. Alltså always be closing och discovery, inte "alltid avsluta".
- **Grindar:** `tools/check-motparten.mjs` (ingår i `npm run check`) och
  `tools/motparten-rosttext.mjs`, som plockar ut prosan till markdown så
  `granska_rost.py` kan läsa den. "hen" är hårt fel i rösten. Kör rösten FÖRE commit.
- **Åtkomst:** Delägaren och Motparten är skilda produkter och delar ingen session.
  Middlewaren skiljer på värdnamn: Supabase-JWT:n öppnar bara Marginalen, pilotcookien
  bara Motparten. Rättigheter per kurs (vem som får köpa vad) är inte byggt.
- **Säljcoachen** (`/motparten/coach`, `functions/api/coach.js`): diagnos mot kursens
  material i två steg, routning över `REGISTER` och svar på full text ur högst fem
  lektioner. Korpusen genereras med `node tools/bygg-korpus.mjs` till
  `functions/api/_korpus.js` och **committas**; grinden faller om den är ur synk eller om
  en semantisk canary saknas. Utvinningen ligger i `tools/lib/motparten-text.mjs` och är
  medvetet skild från `stegProsa` i röstverktyget, som tappar visualtext,
  evidensnoteringar och myt-påståenden. All logik som går att pröva utan API ligger i
  `functions/api/_routning.js`. Evaluering: `tools/prova-routning.mjs` (billig, kör den
  ofta) och `tools/prova-coachen.mjs` (policy, mänsklig bedömning). Ingen av dem ingår i
  `npm run check`, båda kostar pengar. Kräver `ANTHROPIC_API_KEY` och KV-bindningen `RL`
  på Pages-projektet `motparten`, och faller stängt (501) utan dem. Spec:
  `docs/superpowers/specs/2026-08-29-saljcoachen-design.md`. Plan:
  `docs/superpowers/plans/2026-08-29-saljcoachen.md`.
- Spec: `docs/superpowers/specs/2026-08-22-motparten-saljkurs-design.md`. Plan:
  `docs/superpowers/plans/2026-08-29-motparten-pilot.md`. Bildkällor:
  `docs/kallor/motparten-bildkallor.md`.

---

## Att notera (ej åtgärdas om inte ombedd)
- Ingen konsolideringspass kördes; kursen växte till 127 lektioner / 24 moduler.
- Modul 24 är transformerad till Fokus-JSON som kapitel 18 (`content/fundamental-aktieanalys/18.1` till `18.5`, 24.6-syntesen invävd i 18.5).
- Verktyget "Säkra eller stretcha" (`docs/specs/verktyg-sakra-eller-stretcha.md`) är bara spec, inte byggt i `/verktyg`.
- Användarens egen `Ägarboken - Startsida (standalone).html` innehåller fortfarande några em-dashes (lämnat till användaren).
- `KURS-EXPORT.md` och `src/content/kurs.zip` är artefakter, inte källa.
- **Lanseringsblockerare samlas i `LAUNCH.md`**, numera för båda kurserna. `functions/api/devlink.js` härdades 2026-07-12 (mintar ingen länk för befintligt konto och faller stängt utan `SUPABASE_SECRET_KEY`), men är fortfarande en testväg som ska bort före publik lansering. Motpartens pilotinloggning (`/pilot`) är P0 för den kursen.
- Sebastian har ännu inte granskat de tolv "Sebastian tänker"-anekdoterna eller de tolv principerna i Motparten. De är skrivna i hans namn.
- `design-explorations/` är borttagen (2026-07-10). Labs-mockar dual-writeas inte längre dit, prototyphistoriken finns i git-historiken.
