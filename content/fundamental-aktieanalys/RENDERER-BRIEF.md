# Renderar-brief: Fokus-lektionsspelaren

Du bygger renderaren som ritar steg-JSON-lektionerna i den nya designen. **Datan (denna mapp) är kontraktet, designen (`design_handoff_aktieanalys/`) är facit för utseendet.** Läs `CLAUDE.md` i roten för projektets hårda regler innan du börjar.

## Källor

- **Visuell sanning:** `design_handoff_aktieanalys/Aktieanalys - Lektion (Fokus).dc.html` + `README.md`. Hög-fidelity. DC-formatet är spec, inte kod att lyfta in, återskapa i vår stack. Prototypen är **inte JSON-driven** (stegen är hårdkodade), din uppgift är att göra den datadriven från JSON:en här.
- **Datakontrakt:** denna mapp. `course.json` (kapitelträd) + en JSON per lektion. **`1.2-pris-mot-varde.json` är den kanoniska exempel-lektionen.**

## Lektionens form

```jsonc
{ "kapitel": 1, "lektion": "1.2", "titel": "...", "niva": "Nybörjare",
  "tid_min": 8, "mal": "...", "steg": [ /* se nedan */ ] }
```

`course.json`: `kurs`, `titel`, `beskrivning`, `kapitel[]` -> `{ nummer, titel, lektioner[] }`, där lektion = `{ lektion, titel, niva, tid_min, status, fil }`. `status`: `klar` = öppen, `kommande` = lås/dölj.

## Stegtyper (`steg[].typ`) — fem, i denna ordning per lektion

| typ | fält | designref |
|---|---|---|
| `intro` | `kicker`, `titel`, `ingress` | Steg 1: centrerad titel, kicker i mint letter-spacing .28em, rubrik Newsreader 300 clamp(48,7vw,84). |
| `reading` | `kicker`, `lead`, `highlight`, `brodtext[]`, `takeaway` | Steg 2: lead Newsreader 300 med **mint-highlight på `highlight`** (garanterat ordagrann delsträng av `lead`). `takeaway` ritas som "TA MED DIG"-citat med `border-left:2px var(--mint)`. |
| `concept` | `kicker`, `titel`, `visual`, `forklaring` | Steg 3: visual + förklaring under. |
| `dataviz` | `titel`, `underrubrik`, `visual`, `slutsats` | Steg 4: visual + slutsats under. |
| `quiz` | `fragor[]` | Steg 5: se Quiz. |

## Visual-objektet (`concept.visual`, `dataviz.visual`)

`switch` på `visual.typ`. Alla visuals har `typ` + `figurtext`. **v1 stödjer dessa (alla finns i designen):**

- **`rutnat`** (designens ägar-visual, steg 3) — `kolumner` (int), `celler` (int), `markerad` (index, 0-baserad), `etikett` (text i markerad cell, t.ex. "DU"). Rita rutnät, en cell mint med pop-in stagger. Ex: `{ "typ":"rutnat", "kolumner":7, "celler":28, "markerad":9, "etikett":"DU", "figurtext":"..." }`.
- **`linjediagram`** (designens pris/värde-graf, steg 4) — `serier[]` av `{ namn, stil:"heldragen"|"streckad", accent?:bool, punkter:[y-värden 0..100] }` (x implicit per index). Valfri `markor: { serieIndex, punktIndex, etikett }` (t.ex. "köpläge"-punkt). Legend från `serier[].namn`/`stil`. Heldragen accent-linje ritas via `stroke-dashoffset`-animering, streckad = `var(--line-price)`. Se `1.2-pris-mot-varde.json`.
- **`jamforelse`** (enkel, ej i prototypen men trivial) — `element[]` av `{ rubrik, text }` (oftast 2 kort mot varandra).

Framtida (be om dem innan jag producerar data som kräver dem): `stapeldiagram`, `flode`, `andel`. Möter du en `visual.typ` du inte stödjer: rendera `figurtext` som fallback, krascha inte.

## Quiz (`quiz.fragor[]`)

```jsonc
{ "typ": "single" | "multi", "fraga": "...", "underrubrik": "Välj alla som stämmer",
  "alternativ": ["...","..."], "ratt": [0], "forklaring": "..." }
```

- **`ratt` är alltid en lista av index**, även single (`[0]`). `single` = radio (exakt ett rätt). `multi` = checkbox (exakt matchande mängd krävs för rätt).
- `underrubrik` är valfri (mest för multi).
- "Rätta svar" disabled tills alla frågor besvarats. **Godkänt vid >= 80% rätt** (designens tröskel). Visa poäng + `forklaring` per fråga + "Gör om". Återanvänd scoring-mönstret, jämför med designen och befintliga `src/components/Quiz.astro`.

## Hårda krav

1. **Inga em-dashes (—) eller en-dashes (–) i visad text.** Injicera inte streck själv (formatera inte intervall med tankstreck). Datan här är redan dashfri. (OBS: prototypens HTML innehåller em-dashes i sina exempeltexter, de ska INTE återskapas, använd datan.)
2. **Inline-SVG för diagram**, inga bildfiler, inga chart-bibliotek. Temamedvetet via CSS-variabler / `currentColor`.
3. **Två teman:** mörkt ("fokus") + ljust editorial ("ed"), delas via `localStorage['agarboken-theme']` (`light`/`dark`) genom hela flödet, behåll den nyckeln. Tokens finns i handoffens README.
4. **Interaktion:** ett steg i taget, fram/tillbaka, klickbara steg-prickar, piltangenter ←/→. Respektera `prefers-reduced-motion` (designens `data-motion="off"`). Entré-animering via vanlig CSS (designens `data-safe`-timer är en prototyp-grej, behövs inte). Återanvänd mönster från `src/scripts/deck.ts`.
5. **Tillgänglighet:** semantisk markup, aria på navigering/quiz, full tangentbordsstyrning.
6. **Fältnamnen är ett kontrakt.** Byt inte namn på fält i datan. Behöver du en annan struktur eller ny visual-typ, säg till content-sidan så regenereras JSON. (Prototypens interna namn `q`/`exp`/`correct` är prototyp-ismer, mappa dem till kontraktets `fraga`/`forklaring`/`ratt`.)

## Synk tillbaka

När renderaren ritar `rutnat`, `linjediagram`, `jamforelse` + quiz korrekt mot `1.2-pris-mot-varde.json`: säg om du vill ha fler visual-typer i v1, så producerar content-sidan resten av kap 1-3 (9 lektioner) mot exakt det stödet.
