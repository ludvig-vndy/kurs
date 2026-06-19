# Playbook: röst- och de-AI-pass (per lektion)

Detta är arbetsinstruktionen för en redigerare som kör röstpasset på EN lektion.
Den fångar kalibreringen som godkändes på lektion 1.1. Följ den exakt.

## Uppdraget i en mening

Dämpa de mönster som får prosan att läsa som AI, och ta bort alla "hen". Det är
INTE en innehållsomskrivning. Fakta, siffror, formler, struktur och korrekthet
rör du inte. Endast rösten kalibreras.

## ABSOLUT ORÖRT (bryt aldrig)

- **Inga siffror ändras.** Inga belopp, procent, år, multiplar, antal, datum,
  tickers. En siffer-vakt jämför varje tal mot baslinjen och failar passet om
  något tal rör sig. Skriv om meningen runt talet, aldrig talet.
- **Inga fakta, formler, bolagsnamn eller korsreferenser** (N.M, "Del N",
  "Modul N", "(1.2)", "(17.4)") ändras. Citera dem ordagrant.
- **Strukturen står still:** rör inte YAML-frontmattern (titel, quiz, niva,
  ordning ...), lägg inte till eller ta bort `##`-sektioner, byt inte rubriker.
  Rubriken "Hur en erfaren investerare tänker" MÅSTE stå kvar ordagrant
  (strukturgrinden kräver en sektion som matchar "erfaren investerare").
- **Inga em-dash (—) eller en-dash (–).** Använd komma, kolon, punkt, eller
  "till" för intervall. (Matematiskt minus − i formelbilagan är undantag, men
  den filen rör du inte.)
- **Quiz rörs inte** (det ligger i frontmattern).

## "Hen" ska bort helt (hård grind: 0)

Ersätt varje "hen", "hens", "henom". Använd ALDRIG "han/hon", "han eller hon",
"denne", eller (för en generisk investerare) "hon"/"han". Prioritetsordning:

1. **Skriv om till direkt tilltal ("du").** Förstahandsval. Mest levande, bryter
   tredjepersonsmallen.
2. Skriv om till ett konkret påstående utan pronomen.
3. Behövs tredjeperson: använd substantivet, varierat ("en erfaren investerare",
   "investeraren", "en van placerare"). Upprepa inte mekaniskt.

Hen-meningarna är nästan alltid "Hur en erfaren investerare tänker"-mallen
("hen frågar inte X utan Y"). Ta bort hen OCH bryt mallen i samma drag.

Undantag: en namngiven metafor-karaktär som traditionellt har genus (t.ex.
Mr Market, "en man som dyker upp varje dag ... han bjuder") behåller sitt "han".
Det är en personifierad figur, inte ett pronomen för en generisk person.

## Dämpa dessa AI-mönster (fallande vikt)

1. **Antitesen.** RÄKNA dem innan du lämnar lektionen. Behåll HÖGST EN per
   lektion, där den verkligen landar. Alla dessa former räknas, även punkt-
   separerade och insprängda:
   - "Det är inte X, det är Y." / "X är inte A. Det är B."
   - "Inte X, utan Y." / "inte X, snarare Y."
   - "..., inte Y." (insprängd negation: "är beteendemässiga, inte analytiska")
   Resten skrivs om till raka påståenden. Två antiteser räcker för att en sida
   ska läsa som mall. Undantag: en lektion vars hela poäng ÄR en kontrast (t.ex.
   temperament > intelligens) får bära den kontrasten, men håll ändå nere de
   övriga.
2. **Metaprat om sig självt.** "det fina är att", "poängen är", "lägg märke till",
   "lärdomen är", "det leder till ... obekvämaste sanning", "det är hela
   spänningen", "det är det verkliga resultatet av övningen". Skär det. Säg saken
   rakt, rama inte in din egen poäng.
3. **Tredjepersonsmallen** ("Erfarna investerare kör ett test ...", "de tänker").
   Bryt mot "du"-tilltal. Rubriken står kvar, prosan bryts.
4. **Sammanfattningsmeningen sist** som städar ihop allt ("det är skillnaden
   mellan att analysera och att gissa", "Samma X, motsatt Y"). Stryk eller variera.
5. **Treradingen.** "X, Y och Z" i parallell. Bryt upp, variera antalet. OBS:
   en lista av tre SAKLIGA led (t.ex. de tre källorna till avkastning) är
   innehåll, inte dekoration. Behåll den.
6. **Småord som fyller rytm:** genuint, faktiskt, just, själva, precis,
   verkligen. Tunna ut kraftigt.
7. **Jämn, slät kadens och överförklaring.** Variera meningslängd. Korta tvära
   meningar bredvid längre. Avsluta ibland tvärt. Lita på läsaren, lämna något
   osagt.

## Stilriktning (det positiva)

Skriv som en expert som pratar med en skarp junior, inte som en lärobok som
berättar om sig själv. Säg poängen, rama inte in den. Konkret före abstrakt.
En bra metafor slår tre (behåll de bästa, färre). Behåll värmen och det raka
tilltalet. Överkorrigera INTE till platt, generisk prosa.

## Gold-standard (lektion 1.1, godkänd)

Metaprat bort:
- FÖRE: "Det här är kursens första lektion av en anledning. ... Lektionens hela
  syfte är att installera den inställning som får resten att fungera."
- EFTER: "Allt annat i kursen vilar på den här lektionen. ... Sitter den här
  inställningen får resten fäste."

Hen + antites-mall bort, du-tilltal:
- FÖRE: "Därför förankrar en seriös investerare allt i verksamheten och behandlar
  multipelförändringar som en medvind eller motvind **hen** inte styr över. Det är
  den professionella hållningen: bygg ditt case på det du kan analysera, **inte på
  det du bara kan hoppas på**."
- EFTER: "Så förankra allt i verksamheten och se multipeln som en vind **du** inte
  rår över. Bygg ditt case på det du kan analysera. **Hoppet är ingen strategi.**"

Tredjepersonsmallen bruten (rubrik kvar):
- FÖRE: "**Erfarna investerare kör** ett enkelt test innan **de** köper något ..."
- EFTER: "En van investerare kör ett enkelt test innan köp, **och du kan ta över
  det direkt** ..."

Jämn kadens + summeringsmening bort:
- FÖRE: "Spekulanten tittade på samma skärm, såg rött och sålde. **Samma kurs,
  samma bolag, motsatt handling.** Den enda skillnaden var vilket av de två talen,
  pris eller värde, de hade tittat på."
- EFTER: "Spekulanten såg rött och sålde. Det enda som skilde dem var om de läste
  priset eller värdet."

## Arbetssätt

1. Läs hela lektionen. Identifiera hen, antiteser, metaprat, mallen, tretal,
   småord.
2. Gör riktade ändringar (helst mening för mening) så allt annat står still.
3. Räkna kontroll: 0 hen, högst 1 antites, struktur intakt, inga streck, inga
   siffror rörda.
4. Rapportera kort: vad du ändrade (mönster för mönster) och bekräfta att inga
   siffror/rubriker/korsref rördes.

Banna dessa fraser (strukturgrinden failar på dem): "Samma sak, motsatta",
"Det är därför", "En konkret kontrast: ett annat bolag", "Tecknet: fråga".
