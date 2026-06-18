# Stilguide (FRYST indata för omskrivningen)

Varje omskrivnings- och nyskrivningsagent får den här filen som indata. Syftet är
att 100+ lektioner, skrivna av olika agenter, ändå låter som en röst och håller
korrekthet.

## Röst och ton

- En erfaren investerare som lär upp en yngre analytiker. Lugn, konkret,
  förtroendeingivande. Mentor, inte föreläsare. Kalibrera mot lektion 19.9.
- Premium men inte högtravande. Förklara svårt enkelt; undvik akademisk jargong.
- Lär via berättelser, exempel och mentalmodeller, inte definitioner i rad.

## Språkregler (struktur­grinden upprätthåller delar av detta)

- Korta, läsbara meningar. Bryt meningar över ~40 ord.
- Ingen svengelska: "moat" får användas som inlånad term men böj den inte
  ("moatad", "moats" är förbjudet — skriv "vallgrav" eller "konkurrensfördel",
  eller "en moat / flera moats" → "konkurrensfördelar").
- Bannlysta mallfraser (se `lean-lesson-template.md`): "Samma sak, motsatta",
  "Det är därför", "En konkret kontrast: ett annat bolag", "Tecknet: fråga".
- Greppet "två identiska bolag, en variabel" är tillåtet men selektivt — inte i
  varje lektion.

## Sifferpolicy för verkliga bolag (KRITISK)

Den största korrekthetsrisken i hela omskrivningen. Regler:

1. **Uppfinn aldrig finansiella tal för ett namngivet bolag.** Inga påhittade
   P/E, marginaler, ROIC, kurser eller marknadsandelar.
2. **Kvalitativa mönster om namngivna bolag är OK** ("Evolutions skalfördel",
   "SSAB är cykliskt", "Hermès har prissättningskraft") — så länge de är stabila,
   väletablerade sanningar, inte färska påståenden.
3. **Riktiga siffror får bara användas om de kommer från en användarlevererad
   källa** (Börsdata-export, en specifik årsredovisning). Märk dem daterade och
   "ungefärliga", och citera källan/året i texten.
4. **Konstruerade exempel ska märkas som illustrativa** ("ett tänkt bolag",
   "siffrorna är påhittade för att visa principen").
5. Kursen ger **aldrig köp- eller säljråd**. Verkliga bolag är undervisningsfall
   som illustrerar tidlösa mönster.

## Formler och definitioner

Omdefiniera aldrig en formel i en lektion. Länka till `00-referens/formelbilaga.md`
och använd dess definitioner ordagrant. Avvikelse från bilagan = fel.

## Korsreferenser

Lär ut ett begrepp på ett ställe; referera därifrån. Format: "(9.2)" eller
"korsref 17.3". Referensen måste peka på en lektion som finns (refs-grinden fäller
döda referenser).

## Struktur

Följ `docs/lean-lesson-template.md`. Synteslektioner (`format: "syntes"`) ska vara
en integrerande övning, inte en passiv sammanfattning.
