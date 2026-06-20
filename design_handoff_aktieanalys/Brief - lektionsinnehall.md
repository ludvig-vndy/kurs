# Brief till Claude: ta fram lektionsinnehåll för Ägarboken

> Klistra in allt nedanför linjen till Claude. Bifoga gärna en skärmbild av en
> färdig lektion (Fokus-spelaren) samt filen `Aktieanalys - Lektion (Fokus).dc.html`
> så Claude ser exakt vilket format innehållet ska passa in i.

---

## Roll & uppdrag
Du hjälper mig att skriva innehållet till en kurs i **fundamental aktieanalys** för
privatinvesterare (svenska). Kursen visas i en lektionsspelare som tar ett **steg i taget**.
Jag behöver att du producerar innehållet **i ett fast format** (se schema nedan) så att jag
kan slussa in det i spelaren utan att designa om något.

Producera **en lektion i taget**. Börja med den lektion jag anger. Fråga inte om lov mellan
stegen — leverera hela lektionen, så säger jag till om något ska justeras.

## Ton & språk
- Svenska. Klart, konkret, vuxet. Skriv som en kunnig mentor, inte en lärobok.
- Inga em-dashes (—). Använd komma, kolon eller punkt.
- Undvik fluff, utropstecken och säljspråk. Inga emojis i brödtext.
- Korta stycken. En idé i taget. En lektion ska kunna tas på en kafferast.
- Förklara med konkreta exempel och siffror där det hjälper, men hitta inte på
  vilseledande "fakta" om verkliga bolag. Generiska/illustrativa exempel är okej och ska
  märkas som illustrativa.

## Lektionens format (detta är viktigast)
Varje lektion är en sekvens av **steg**. Varje steg har en `typ`. Använd endast dessa typer:

1. **`intro`** — öppningssteg. Fält: `kicker` (kort versal etikett), `titel` (kort, kraftfull),
   `ingress` (1 mening som ramar in varför lektionen finns).
2. **`reading`** — läsesteg. Fält: `kicker`, `lead` (1 stort stycke; markera EN nyckelmening
   som ska framhävas via `highlight`), `brödtext` (1–3 stycken), `takeaway` (1 mening, citat
   som eleven ska ta med sig).
3. **`concept`** — ett begrepp förklarat med en enkel visualisering. Fält: `kicker`, `titel`,
   `visual` (se "Grafik" nedan), `förklaring` (2–3 meningar under bilden).
4. **`dataviz`** — ett steg byggt runt en graf/diagram. Fält: `titel`, `underrubrik`,
   `visual` (se "Grafik"), `slutsats` (1 mening som säger vad grafen bevisar).
5. **`quiz`** — avslutande kunskapskoll. 3 frågor. Format under "Quiz" nedan.

En typisk lektion: `intro` → `reading` → `concept` → `dataviz` → `quiz` (4–6 steg totalt).
Anpassa efter ämnet, men håll dig till typerna ovan.

## Grafik (så slipper vi ett enormt bildjobb)
Designen använder **inga foton**. Grafer ritas som inline-SVG ur data. Beskriv därför varje
`visual` som en **datadriven specifikation**, inte som en bild. Välj en av:

- **`linjediagram`**: ange serier (namn, om den är heldragen/streckad, färgroll
  `accent`/`neutral`), datapunkter (x,y eller en kort lista värden), ev. en markerad punkt
  med etikett, samt vad axlarna betyder. (Ex: pris vs värde över tid.)
- **`stapeldiagram`**: kategorier + värden + vad de visar.
- **`rutnät`/`andel`**: t.ex. 28 rutor där X är markerade (för att visa ägarandel,
  fördelning, proportion).
- **`flöde`/`steg`**: 3–5 noder med korta etiketter (för en process, t.ex. intäkt → kostnad
  → vinst → kassaflöde).
- **`jämförelse`**: två kort/kolumner ställda mot varandra (t.ex. pris vs värde, bra vs dålig).

Endast om ett steg **genuint kräver en riktig bild** (sällsynt): märk den som
`bildplatshållare` med `alt`, `beskrivning` (vad bilden ska föreställa) och `proportion`
(t.ex. 16:9). Jag fyller i bilden själv senare.

För varje `visual`, ange alltid: `typ`, `data`/`element`, `etiketter`, och en
`figurtext` (1 rad) som förklarar vad man tittar på.

## Quiz-format
3 frågor per lektion. Blanda gärna `single` (ett rätt svar) och `multi` (flera rätta).
Per fråga: `typ`, `fråga`, `alternativ` (3–4 st), `rätt` (index/lista), `förklaring`
(1–2 meningar som motiverar svaret och fäster lärdomen). Godkänt = 80% rätt.

## Leveransformat
Leverera som **JSON** enligt detta skelett (fyll i, lägg till steg efter behov):

```json
{
  "kapitel": 2,
  "lektion": "2.1",
  "titel": "Resultaträkningen",
  "nivå": "Nybörjare",
  "tid_min": 10,
  "mål": "Efter lektionen kan eleven läsa en resultaträkning uppifrån och ner och förstå vad varje rad betyder.",
  "steg": [
    { "typ": "intro", "kicker": "LEKTION 2.1", "titel": "...", "ingress": "..." },
    { "typ": "reading", "kicker": "...", "lead": "...", "highlight": "den mening i lead som ska framhävas", "brödtext": ["...", "..."], "takeaway": "..." },
    { "typ": "concept", "kicker": "...", "titel": "...", "visual": { "typ": "flöde", "element": ["Intäkter","− Kostnader","= Rörelseresultat"], "figurtext": "..." }, "förklaring": "..." },
    { "typ": "dataviz", "titel": "...", "underrubrik": "...", "visual": { "typ": "stapeldiagram", "data": [{"kategori":"...","värde":0}], "etiketter": "...", "figurtext": "..." }, "slutsats": "..." },
    { "typ": "quiz", "frågor": [
      { "typ": "single", "fråga": "...", "alternativ": ["...","...","..."], "rätt": [1], "förklaring": "..." }
    ]}
  ]
}
```

## Kursplan att fylla (gör en lektion i taget)
- **Kapitel 1 — Investeringsfilosofi:** 1.1 Vad det innebär att äga en aktie (KLAR, använd som
  referens för ton/format), 1.2 Pris mot värde.
- **Kapitel 2 — Att läsa ett bolag:** 2.1 Resultaträkningen, 2.2 Balansräkningen,
  2.3 Kassaflödet, 2.4 Nyckeltal som faktiskt betyder något.
- **Kapitel 3 — Värdering i praktiken:** 3.1 Vad är värde?, 3.2 Multiplar och deras fällor,
  3.3 Diskonterat kassaflöde, 3.4 Säkerhetsmarginal, 3.5 Att sätta ett riktpris.

**Börja med lektion 1.2 (Pris mot värde).** Leverera hela JSON-objektet. Efter att jag
godkänt den fortsätter vi i ordning.
```
