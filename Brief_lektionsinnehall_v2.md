# Brief till Code: transformera kursinnehåll till Ägarbokens lektionsspelare

## Uppdraget i en mening

Du transformerar färdiga, korrekthetsgranskade lektioner (markdown i repot) till Fokus-spelarens stegformat. Du skriver inget nytt innehåll, du kondenserar och strukturerar det som redan finns och är verifierat.

## Källa och artefakt (läs först, allt annat följer av detta)

- Den verifierade lektionstexten i markdown är källan och den enda sanningen. Den är redan faktakollad, röstsatt och granskad. Rör inte dess innebörd.
- Spelaren renderar strukturerad stegdata (intro, reading, concept, dataviz, quiz, med highlight, grafspecar och quizsvar), inte prosa. Den datan är en härledd artefakt som genereras ur källan, aldrig något som underhålls för hand.
- Din uppgift är transformen: läs prosalektionen, kondensera den till stegen, behåll innebörden exakt. Det är det enda steget mellan källan och spelaren.
- Lägg inga nya påståenden, siffror eller begrepp. Om ett steg skulle kräva något källan saknar, håll det kvalitativt eller flagga det, fabricera aldrig. Tydligt märkta illustrativa exempel är tillåtna (se sifferpolicyn).

## Källmappning (läs rätt källa innan du börjar)

Varje lektion i spelaren kondenserar en eller flera redan verifierade källlektioner i repot. Numreringen skiljer sig från huvudkursen.

| Spelarlektion | Källlektion(er) i kursen |
|---|---|
| 1.1 Vad det innebär att äga en aktie | 1.1 (mall, redan klar) |
| 1.2 Pris mot värde | 1.2, stöd av 12.1 |
| 2.1 Resultaträkningen | Modul 4 (4.1 till 4.3) |
| 2.2 Balansräkningen | Modul 5 (5.1 till 5.3) |
| 2.3 Kassaflödet | Modul 6 (6.1 till 6.3) |
| 2.4 Nyckeltal som faktiskt betyder något | Modul 8 (8.1) och Modul 9 (9.1) |
| 3.1 Vad är värde? | 12.1, stöd av 12.3 |
| 3.2 Multiplar och deras fällor | Modul 13 (13.1, 13.2, 13.4) |
| 3.3 Diskonterat kassaflöde | 14.1, 14.3 |
| 3.4 Säkerhetsmarginal | 15.2 |
| 3.5 Att sätta ett riktpris | 14.4 och 14.5, stöd av 12.3 |

Definitioner och formler hämtas från formelbilagan i repot, inte omdefinierade.

## Ton och språk (gäller utdatan)

- Svenska. Klart, konkret, vuxet. En kunnig mentor, inte en lärobok. Källans röst är redan satt, bevara den.
- Inga em-dashes (—) och inga en-dashes (–) i utdatan. Använd komma, kolon, punkt, och "till" för intervall (skriv "2 till 3 procent", inte "2–3 procent"). Obs: källtexten kan innehålla em-dashes (1.1 gör det), transformen ska ta bort dem, aldrig föra dem vidare.
- Korta steg, en idé i taget. En lektion ska kunna tas på en kafferast.
- Inga utropstecken, inget säljspråk, inga emojis.

## Siffer- och datapolicy

- Uppfinn aldrig finansiella tal för ett namngivet verkligt bolag. Siffror kommer ur källlektionen (redan verifierad) eller är uttryckligen illustrativa och märkta "illustrativt".
- Använder källan ett verkligt bolag med riktiga, daterade tal (som Lifco-fallet), behåll dem exakt och daterade, lägg inte till eller ändra siffror.
- Tidskänsliga regler (skatt, satser) återges som mekanism, inte med ett fryst tal som åldras.

## Stegschema (spelarens format)

Varje lektion är en sekvens av steg. Varje steg har en `typ`. Använd endast dessa typer:

1. **`intro`**: `kicker` (kort versal etikett), `titel` (kort, kraftfull), `ingress` (1 mening som ramar in varför lektionen finns).
2. **`reading`**: `kicker`, `lead` (1 stort stycke; markera EN nyckelmening via `highlight`, som måste vara en ordagrann delsträng av `lead`), `brödtext` (1 till 3 stycken), `takeaway` (1 mening att ta med sig).
3. **`concept`**: `kicker`, `titel`, `visual` (se Grafik), `förklaring` (2 till 3 meningar under bilden).
4. **`dataviz`**: `titel`, `underrubrik`, `visual` (se Grafik), `slutsats` (1 mening som säger vad grafen visar).
5. **`quiz`**: avslutande kunskapskoll, 3 frågor (format nedan).

En typisk lektion: `intro`, `reading`, `concept`, `dataviz`, `quiz`, alltså 4 till 6 steg. Anpassa efter ämnet, men håll dig till typerna ovan.

## Grafik (datadriven, genereras ur källan)

Inga foton. Grafer ritas som inline-SVG ur data, så beskriv varje `visual` som en datadriven specifikation, inte som en bild. Välj en av:

- **`linjediagram`**: serier (namn, heldragen eller streckad, färgroll `accent` eller `neutral`), datapunkter, ev. en markerad punkt med etikett, och vad axlarna betyder.
- **`stapeldiagram`**: kategorier, värden, vad de visar.
- **`rutnät`/`andel`**: t.ex. 28 rutor där X är markerade (ägarandel, fördelning, proportion).
- **`flöde`/`steg`**: 3 till 5 noder med korta etiketter (en process, t.ex. intäkt, kostnad, vinst, kassaflöde).
- **`jämförelse`**: två kort eller kolumner mot varandra (pris mot värde, bra mot dålig).

Skilj på två slags grafik. Datagrafer (linje, stapel) ska använda tal ur källlektionen, eller vara uttryckligen illustrativa och märkta. Konceptuella visualiseringar (flöde, jämförelse, andel) får konstrueras fritt, de illustrerar en princip. En felaktig eller vilseledande datagraf är värre än ingen.

Endast om ett steg genuint kräver en riktig bild (sällsynt): märk den `bildplatshållare` med `alt`, `beskrivning` och `proportion` (t.ex. 16:9).

För varje `visual`, ange alltid `typ`, `data`/`element`, `etiketter`, och en `figurtext` (1 rad) som förklarar vad man tittar på.

## Quiz-format

3 frågor per lektion. Blanda gärna `single` (ett rätt svar) och `multi` (flera rätta). Per fråga: `typ`, `fråga`, `alternativ` (3 till 4 st), `rätt` (index eller lista), `förklaring` (1 till 2 meningar som motiverar svaret och fäster lärdomen). Det markerade rätta svaret ska faktiskt vara korrekt, distraktorerna rimliga. Godkänt = 80 procent rätt.

## Utdata

Emittera spelarens stegformat som JSON enligt skelettet nedan, som en genererad artefakt. En fil per lektion enligt repots konvention för spelaren (fråga om du är osäker på sökväg). Detta är utdata från transformen, inte en andra källa att underhålla. Om spelaren i stället läser strukturerad markdown gäller samma stegstruktur, byt bara container.

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
    { "typ": "concept", "kicker": "...", "titel": "...", "visual": { "typ": "flöde", "element": ["Intäkter","minus Kostnader","är lika med Rörelseresultat"], "figurtext": "..." }, "förklaring": "..." },
    { "typ": "dataviz", "titel": "...", "underrubrik": "...", "visual": { "typ": "stapeldiagram", "data": [{"kategori":"...","värde":0}], "etiketter": "...", "figurtext": "..." }, "slutsats": "..." },
    { "typ": "quiz", "frågor": [
      { "typ": "single", "fråga": "...", "alternativ": ["...","...","..."], "rätt": [1], "förklaring": "..." }
    ]}
  ]
}
```

## Validering (kör på utdatan, per lektion)

Allt nedan kontrolleras på den genererade utdatan, inte bara på källtexten.

- Giltig JSON, och endast de fem tillåtna stegtyperna.
- Alla obligatoriska fält för varje stegtyp finns.
- Inga em-dashes och inga en-dashes någonstans i utdatan, även om källan hade dem.
- Varje `reading.highlight` är en ordagrann delsträng av sitt `lead`.
- Varje `concept` och `dataviz` har en `visual` med `typ` och `figurtext`. `dataviz` har en `slutsats`, `concept` har en `förklaring`.
- Quizet har exakt 3 frågor, var och en med 3 till 4 alternativ, giltiga `rätt`-index, och en `förklaring`. Det markerade svaret är faktiskt korrekt.
- Troget källan: inget påstående, tal eller bolagssiffra som inte finns i källan (eller är tydligt märkt illustrativt).
- 4 till 6 steg, och lektionen går att ta på en kafferast.

## Arbetsordning

1. Läs den verifierade 1.1 (källtext) och spelaren, för att fånga format och röst. Notera att 1.1:s källtext har em-dashes, de ska bort i transformen.
2. Transformera 1.2 (källa: 1.2, stöd av 12.1) som kalibreringslektion. Stanna och vänta på godkännande.
3. När 1.2 är godkänd är den mallen. Fortsätt i kursplanens ordning, en lektion i taget, och validera varje mot kriterierna ovan.

## Kursplan

- Kapitel 1, Investeringsfilosofi: 1.1 (klar, mall), 1.2 Pris mot värde.
- Kapitel 2, Att läsa ett bolag: 2.1 Resultaträkningen, 2.2 Balansräkningen, 2.3 Kassaflödet, 2.4 Nyckeltal som faktiskt betyder något.
- Kapitel 3, Värdering i praktiken: 3.1 Vad är värde?, 3.2 Multiplar och deras fällor, 3.3 Diskonterat kassaflöde, 3.4 Säkerhetsmarginal, 3.5 Att sätta ett riktpris.

Börja med 1.2.
