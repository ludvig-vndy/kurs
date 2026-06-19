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

`switch` på `visual.typ`. Alla visuals har `typ` + `figurtext`. **v1 stödjer dessa sex:**

- **`rutnat`** (designens ägar-visual, steg 3) — `kolumner` (int), `celler` (int), `markerad` (index, 0-baserad), `etikett` (text i markerad cell, t.ex. "DU"). Rita rutnät, en cell mint med pop-in stagger. Ex: `{ "typ":"rutnat", "kolumner":7, "celler":28, "markerad":9, "etikett":"DU", "figurtext":"..." }`.
- **`linjediagram`** (designens pris/värde-graf, steg 4) — `serier[]` av `{ namn, stil:"heldragen"|"streckad", accent?:bool, punkter:[y-värden 0..100] }` (x implicit per index). Valfri `markor: { serieIndex, punktIndex, etikett }` (t.ex. "köpläge"-punkt). Legend från `serier[].namn`/`stil`. Se `1.1` (1 serie) och `1.2` (2 serier + markör).
- **`jamforelse`** — `element[]` av `{ rubrik, text }` (oftast 2 kort mot varandra). Se `1.2`.
- **`stapeldiagram`** — `data[]` av `{ kategori, varde, accent?:bool }`, `etiketter` (vad värdena visar, ev. enhet), `figurtext`. `varde` kan vara negativt (nollinje i mitten). `accent:true` framhäver en stapel. Datagraf: använd tal ur källan eller märk som illustrativt i `figurtext`.
- **`flode`** — `noder[]` av `{ etikett, operator?: "minus"|"plus"|"likamed", accent?:bool }` (3 till 5 noder), `figurtext`. Rita som kedja: intäkt, minus kostnad, lika med resultat. `accent` på slutnoden. (Konceptuell, får konstrueras fritt.)
- **`andel`** — `delar[]` av `{ etikett, varde, accent?:bool }` (värdena är proportioner, renderaren normaliserar till 100%), `figurtext`. Rita som 100%-staplad stapel eller ring, t.ex. eget kapital mot skulder. (Konceptuell.)

Möter du en `visual.typ` du inte stödjer: rendera `figurtext` som fallback, krascha inte.

## Text-tunga lektioner (formatet flexar)

Stegen är en riktlinje, inte en tvångströja. Låt innehållet avgöra balansen, tvinga aldrig fram en graf för att fylla ett steg.

- **Stegen är valfria.** En lektion behöver inte ha alla fem. En text-tung lektion kan vara `intro` + flera `reading` + `quiz`, utan `concept`/`dataviz`. Behåll ordningen (de steg som finns kommer i samma relativa ordning).
- **`visual` är valfritt på `concept`/`dataviz`.** Utelämna `visual` helt för ett rent text-steg, renderaren visar då bara texten (ingen tom grafik-lucka).
- **`concept`/`dataviz` tar valfritt `brodtext[]`** (array av stycken) för prosa, utöver/istället för `forklaring`/`slutsats`. Använd det när ett steg bär ett resonemang snarare än en form.
- Källan styr högen: siffror/tabell/räkneexempel/tvåbolags-fall finns det form att rita (grafik-tung), annars bär prosan (text-tung).

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
