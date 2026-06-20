# Handoff: Ägarboken — utbildningsplattform för fundamental aktieanalys

## Overview
En lärplattform som lär privatinvesterare fundamental aktieanalys. Tre delar hänger ihop till ett flöde:

1. **Plattform** (dashboard + kursöversikt) — navet. Visar var eleven är, vad som är nästa, och vägen genom kursen.
2. **Lektionsspelare (Fokus)** — en avskalad, steg-för-steg lektionsvy med text, en data­visualisering (pris vs värde) och en avslutande kunskapskoll (quiz).
3. **Ägarboken — Analysverktyg** — det riktiga, fristående verktyget eleven använder för att gå igenom en checklista/analys *före ett aktieköp*.

De tre delarna delar visuellt språk, navigation (sidomeny på desktop, bottenmeny på mobil) och tema (mörkt + ljust editorial), och länkar till varandra.

## About the Design Files
Filerna i det här paketet är **designreferenser skrivna i HTML** — prototyper som visar avsedd look och beteende, **inte produktionskod att kopiera rakt av**. Två av dem (`*.dc.html`) är byggda i ett internt "Design Component"-format med en egen runtime; **läs dem som spec, inte som kod att lyfta in**. Uppgiften är att **återskapa dessa designer i ert befintliga kodbas-/ramverksval** (React, Vue, Svelte, etc.) med era egna mönster, komponenter och routing. Finns ingen miljö ännu: välj lämpligt ramverk och implementera där. Verktygsfilen (`Ägarboken - Analysverktyg.html`) är däremot ren HTML/CSS/JS och kan läsas direkt.

## Fidelity
**High-fidelity.** Slutgiltiga färger, typografi, spacing och interaktioner. Återskapa pixelnära men med era egna bibliotek/komponenter. Exakta hex- och token-värden finns under *Design Tokens*.

---

## ⚠️ Vad som är riktigt vs attrapp (läs detta först)
Detta är en prototyp. Följande är **medvetna genvägar** — inte buggar, och **inte färdig logik**:

- **All progress är hårdkodad.** "4 dagars svit", kursprocent, "fortsätt där du slutade", antal avklarade lektioner — statiska värden i `renderVals()`. Inget delas faktiskt mellan lektionsspelaren och plattformen. Ni behöver bygga riktig progress-/state-persistens.
- **Låsta kapitel (2 & 3) är skal.** De har titlar, tid och svårighetsgrad men **inget riktigt lektionsinnehåll**. Bara lektion **1.1** är en faktisk, spelbar lektion.
- **Endast en lektion finns.** "Fokus"-spelaren visar lektion 1.1 (5 steg). Övriga lektioner i kursträdet är platshållare.
- **Quizfrågorna är riktiga** (3 st, med rätt/fel + förklaringar) men resultatet sparas inte och påverkar inte progressen.
- **Tema-attrapp:** accentfärgsvalet (Mint/Blå/Amber) gäller **bara i mörkt läge**. I ljust editorial-tema används en fast grön accent.
- **"Safe"-rendering-skydd:** lektion + plattform har en liten timer som tvingar fram allt innehåll (`opacity:1`) om animeringstidslinjen är fryst (en prototyp-renderingsgrej). Ofarlig, men kan tas bort i produktion — ersätt med vanlig CSS-entré-animering.
- **Tema delas via `localStorage`-nyckeln `agarboken-theme`** (`"light"` / `"dark"`). Alla tre filer läser/skriver den. Detta *är* avsett beteende och bör behållas (eller flyttas till er egen theme-provider).

---

## Screens / Views

### 1. Plattform — Dashboard (`Aktieanalys - Plattform.dc.html`, vy `dashboard`)
**Syfte:** Elevens startsida — orientering och snabb återinträde i kursen.

**Layout:** Persistent vänster-rail (248px, fast) + scrollbart innehåll (`inset:0 0 0 248px`). Innehåll centrerat, `max-width:1000px`. Padding `54px clamp(40px,5vw,76px) 70px`.

**Komponenter (uppifrån):**
- **Header-rad** (`flex`, space-between): vänster — tidsanpassad hälsning ("God morgon/dag/kväll", liten versal mint-etikett) + dagens datum (sv-SE, gemener→versal, muted), under dem kurstiteln "Fundamental aktieanalys" (Newsreader 300, `clamp(36px,4.4vw,52px)`) + en ingress. Höger — "svit"-chip: pill, `border:1px solid var(--border-2)`, grön punkt + "{n} dagar i rad".
- **"Fortsätt där du slutade"-kort** (länk → lektion): `background:var(--surface)`, `border:1px solid var(--border-2)`, `border-radius:18px`, padding `28px 30px`. Innehåll: grön kicker (letter-spacing .16em), lektionstitel Newsreader 300 30px, meta-rad muted, progress-bar (5px, `var(--surface-2)` spår / `var(--mint)` fyllning) + procent. Höger: cirkulär 56px pil-knapp `background:var(--mint)`, `color:var(--on-mint)`.
- **"Din väg genom kursen"** (kapitelkarta): rubrik Newsreader 300 24px + diskret länk "Se hela kursen →" (→ kursvyn). Under: `grid` 3 kol (gap 14px, mobil → 1 kol) med ett kort per kapitel. Varje kort = knapp som öppnar **kapitelsidan** (`goChapter(i)`): rad med "KAPITEL N"-kicker + status-pill (Pågår / Klar / Ej börjad / Låst, färgad), kapiteltitel Newsreader 300 21px, mini progress-bar + "{klara}/{totalt}". Låsta kort dämpas (opacity .66). **Ersätter den tidigare statistik-raden.**
- **"Analysera ett bolag"-sektion** (sekundär, längst ner): rubrik Newsreader 300 24px + stort kort som länkar till Ägarboken-verktyget (`border-top:2px solid var(--mint)`), med taggar (Checklista, Kvalitet, Moat …).

> **Ändrat mot tidigare iteration:** den separata 3-kolumners statistik-raden och den dubblerade "Nästa upp / Se hela kursen"-foten är **borttagna** — de upprepade resume-kortet och innehöll svag fyllnad ("inlärd tid"). Hierarkin är nu: en huvudsak (fortsätt) → din väg (kapitelkarta) → övning (Ägarboken).

### 2. Plattform — Kursöversikt (`Aktieanalys - Plattform.dc.html`, vy `course`)
**Syfte:** Hela kursens karta — kapitel, lektioner, framsteg, vad som är låst.

**Layout:** Samma rail. Innehåll `max-width:880px`.

**Komponenter:**
- Brödsmula (Hem › Kursöversikt), kurstitel Newsreader 300 `clamp(32px,4vw,46px)`, ingress (Newsreader 400 17px), total progress-bar + "{n}/{m} lektioner".
- **Kapitel-tidslinje:** vertikal linje (`1px var(--border)`) med numrerade noder (24px cirklar — aktivt kapitel `var(--mint)`/`var(--on-mint)`, annars `var(--surface-2)`). Varje kapitel = kort (`border-radius:16px`); öppet kapitel har `border-2`, låsta har reducerad opacitet (.72) + 🔒. **Kapitelrubriken är en knapp** (med `›`) som öppnar kapitelsidan (`goChapter(i)`). Lektioner i öppet kapitel listas med status-markör: avklarad (grön bock), nästa (mint-soft cirkel), låst (faint ring), tid + CTA ("Repetera"/"Börja →").

### 3. Plattform — Kapitelsida (`Aktieanalys - Plattform.dc.html`, vy `chapter`)
**Syfte:** Den saknade mellannivån mellan översikt och lektion. Ramar in ett kapitel innan eleven börjar — orientering för förstagångsbesökaren. Nås via kapitelkartan på dashboarden, kapitelrubriker i kursöversikten, lektionens "Kapitel N"-brödsmula, och landningssidans "Börja kursen" (→ `#kapitel-1`).

**Layout:** Samma rail. Innehåll `max-width:780px`. "Kursöversikt" markeras aktiv i menyn även här.

**Komponenter (uppifrån):**
- Brödsmula (Hem › Kursöversikt › Kapitel N).
- "KAPITEL N"-kicker (mint) + kapiteltitel Newsreader 300 `clamp(34px,4.4vw,52px)` + inramande sammanfattning (`blurb`, Newsreader 400 18px).
- Meta-rad: tid · nivå · antal lektioner · kapitlets egen progress-bar + "{klara}/{totalt} klara".
- **"Det här lär du dig"-kort** (`border-radius:16px`): 3 lärandemål (`outcomes`), var och en med grön bock-ikon + Newsreader 400 17px.
- **Lektionslista**: varje lektion = rad (länk) med statusmarkör (30px cirkel: klar=grön bock, nästa=mint-soft id, låst=faint ring), titel Newsreader 400 18px, tid, CTA ("Repetera"/"Börja →"/"Låst").
- **Kapitel-CTA** (stor knapp/länk längst ner): "Börja kapitlet" / "Fortsätt kapitlet" (`background:var(--text)`) med undertext "Nästa: lektion X". Låst kapitel → dämpad, ej klickbar, "Slutför föregående kapitel för att låsa upp".

### 4. Lektionsspelare — Fokus (`Aktieanalys - Lektion (Fokus).dc.html`)
**Syfte:** En lektion, ett steg i taget. Avskalat, läsfokuserat.

**Layout:** Persistent vänster-sidomeny (248px) + `main` (flex-kolumn). Topbar (brödsmula + steg-prickar + stegräknare), centrerat innehållsområde, navigeringsknappar under.

**Sidomeny:** logotyp (länk → plattform), sektion "LÄRA" (Hem, Kursöversikt → `Plattform#kurs`, aktiv "Lektion 1.1"), sektion "VERKTYG" (Analysverktyg). Botten: lektionens steg-progress, tema-knapp, profil-rad.

**De 5 stegen:**
1. **Titel** — centrerad. Kicker "LEKTION ETT" (letter-spacing .28em), rubrik Newsreader 300 `clamp(48px,7vw,84px)`, ingress.
2. **Varför det spelar roll** — vänsterställd. Kicker + stort lead-stycke (Newsreader 300, mint-highlight på nyckelmening) + brödtext + "TA MED DIG"-citat (`border-left:2px solid var(--mint)`).
3. **Du köper en bit av bolaget** — centrerad. 7×4 rutnät (28 celler, gap 11px), en cell grön ("DU") med pop-in stagger-animering, förklaring under.
4. **Pris vs värde** — centrerad. SVG-graf: värde-linje (mint, 3px, ritas via `stroke-dashoffset`→`draw`), pris-linje (streckad, `var(--line-price)`, 2px), "köpläge"-punkt (pop-in), legend.
5. **Kunskapskoll (quiz)** — 3 frågor (2 single-choice, 1 multi), alternativ med radio/check-markörer, "Rätta svar"-knapp (disabled tills alla besvarade), resultat med poäng + förklaringar + "Gör om".

**Navigering:** Primärknapp (`background:var(--text)`, `color:var(--bg)`, pill) "Fortsätt" / "Slutför lektionen" / "Till kursöversikten". Sekundär "← Tillbaka" / "← Till kursöversikten". Piltangenter ←/→ navigerar. Steg-prickar i topbaren är klickbara.

### 5. Ägarboken — Analysverktyg (`Ägarboken - Analysverktyg.html`)
**Syfte:** Det riktiga verktyget. En strukturerad checklista/analys eleven fyller i före ett aktieköp. Ren HTML/CSS/JS — läs direkt.

**Layout:** `max-width:1160px`, centrerad. Header (`border-bottom:2px solid var(--petrol)`) med eyebrow (mono), ordmärke (Newsreader 500 40px) + tema-knapp (top-höger). Företagskontext-rad (grid 2fr/1fr/1fr: namn, ticker, kurs som inputs). Sticky flik-nav (horisontell, döljd scrollbar). Innehåll per flik: checklistor med tri-state-toggles (Ja / Oklart / Nej), segment-kontroller, fritextfält.

**Interaktiva mönster:** `.seg` (segment), `.tri` (tre-vägs ja/oklart/nej med färgkodning good/mid/bad), `.btn`. Allt CSS-variabel-drivet — temar om sig automatiskt via `html[data-theme="light"]`.

---

## Interactions & Behavior
- **Navigation:** SPA-likt i `.dc.html`-vyerna via intern `state.view` (`dashboard` / `course` / `chapter`) + `state.chapterIdx`. Mellan filer via vanliga `<a href>`. **URL-hash-routing** läses i `componentDidMount`: `#kurs` → kursöversikt, `#kapitel-N` → kapitelsida N (1-indexerat), annars dashboard. Landningssidans "Börja kursen" och lektionens "Kapitel 1"-brödsmula pekar på `#kapitel-1`.
- **Tema-växling:** knapp togglar `data-theme` (`fokus`/`ed` i plattform & lektion; `light`/default i verktyget) och skriver `localStorage['agarboken-theme']`. Alla filer läser nyckeln vid load → temat följer med genom flödet.
- **Animering:** entré via `@keyframes riseF` (translateY 22px + fade, `cubic-bezier(.21,.7,.18,1)`, staggrad via `animation-delay`). Graf-linjer via `@keyframes draw` (stroke-dashoffset). Rutnät/punkter via `@keyframes pop`. **`data-motion="off"`** stänger av allt. **`data-safe="on"`** tvingar fram synligt innehåll (se attrapp-noten).
- **Quiz-validering:** "Rätta svar" disabled tills varje fråga besvarats. Godkänt vid ≥80% rätt. Single: ett val; multi: exakt matchande mängd krävs för rätt.
- **Responsivt:** brytpunkt **760px**. Desktop: sidomeny/rail. Mobil: rail döljs, **fast bottenmeny** (Hem/Kurs/Verktyg/tema), innehåll full bredd, statistik → 1 kolumn, header bryter radvis. Innehåll får botten-padding för bottenmenyn.

## State Management
**Plattform:** `view` ('dashboard'|'course'|'chapter'), `chapterIdx` (vald kapitelindex), `theme` ('fokus'|'ed'), `safe`. Kursdata i `this.COURSE` (kapitel → `blurb`, `outcomes[]`, `time`, `level`, `open`, `lessons[]` med `state`: done/next/locked). Dashboardens kapitelkarta och kapitelsidan deriveras båda ur `this.COURSE`.
**Lektion:** `slide` (0–4), `answers` (per fråga), `graded`, `done`, `theme`, `safe`.
**Att bygga på riktigt:** elevprogress (avklarade lektioner/steg, svit, senaste position), quiz-resultat, persistens per användare. Idag allt lokalt/hårdkodat.

## Design Tokens

### Färg — Mörkt (default)
| Token | Hex |
|---|---|
| Bakgrund | `#0A0C0B` |
| Yta / panel | `#11140F` |
| Yta-2 | `#161A14` |
| Text | `#F0EDE4` |
| Text mjuk | `#C3C7BC` |
| Text muted | `#777F73` / verktyg `#8A938A` |
| Faint | `#333A32` |
| Accent (mint/petrol) | `#8FD3B0` |
| Accent ljus | `#A6E0C4` |
| Mässing (verktyg) | `#C9A86A` |
| Bad / Mid / Good | `#E0896F` / `#E3C06A` / `#8FD3B0` |
| On-accent (text på mint) | `#0A0C0B` |
| Border / Border-2 | `rgba(255,255,255,.09)` / `.16` |

Accent-varianter (endast mörkt läge): Blå `#83BDEE`, Amber `#E3C06A`.

### Färg — Ljust (editorial)
| Token | Hex |
|---|---|
| Bakgrund | `#EFE9DC` |
| Yta / panel | `#F7F2E7` |
| Yta-2 | `#FCFAF3` |
| Text | `#1E241F` |
| Text mjuk | `#3C4239` / verktyg `#46503F` |
| Text muted | `#6E7568` / verktyg `#7A8170` |
| Faint | `#CBC3B2` |
| Accent (grön) | `#1C6E50` (verktyg `#1C4B47`) |
| Mässing (verktyg) | `#9A6E1C` |
| Bad / Mid / Good | `#A8473A` / `#9A7320` / `#3E7A4F` |
| On-accent | `#F6F3EA` |
| Border / Border-2 | `rgba(30,36,31,.14)` / `.24` |

### Typografi
- **Serif (rubriker, lead, citat):** Newsreader — vikter 300/400/500, kursiv 400. Display använder 300 + `letter-spacing:-.02em`.
- **Sans (UI, etiketter, knappar):** Schibsted Grotesk — 400/500/600.
- **Mono (verktygets eyebrows/etiketter/tal):** IBM Plex Mono — 400/500/600.
- Brödtext (lektion): `--prose-size` 20px (Kompakt 18 / Stor 23), line-height ~1.7.
- Kickers/etiketter: 10–11px, letter-spacing .14–.28em, versaler.

### Spacing & form
- Radier: kort 14–18px, knappar/pills 99px, små chips/celler 6px, verktyg `--r:10px`.
- Sidomeny/rail: 248px. Innehåll max-width: dashboard 1000px, kurs 880px, verktyg 1160px.
- Brytpunkt: 760px.
- Progress-barer: 4–5px höjd.
- Skugga: sparsamt — mint-glow på primära cirkelknappar/celler (`0 8px 22px -6px var(--mint)`).

## Assets
Inga bild-/ikonfiler — alla ikoner är inline-SVG (stroke 1.7, currentColor). Logotyp = enkel mint-fyrkant. Inga emojis utöver 🔒 (låst kapitel) — byt gärna mot ikon i produktion.

## Files
- `Aktieanalys - Plattform.dc.html` — dashboard + kursöversikt (DC-format, läs som spec)
- `Aktieanalys - Lektion (Fokus).dc.html` — lektionsspelare (DC-format, läs som spec)
- `Ägarboken - Analysverktyg.html` — det riktiga analysverktyget (ren HTML/CSS/JS, läsbar direkt)

> **Fonter:** laddas från Google Fonts (Newsreader, Schibsted Grotesk, IBM Plex Mono). Byt till er egen font-leverans i produktion.
