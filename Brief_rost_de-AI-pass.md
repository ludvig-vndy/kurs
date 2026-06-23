# Brief till Code: röst- och de-AI-pass över kurstexten

## Uppdraget i en mening

En fokuserad redigeringspass över den verifierade kurstexten (markdown i repot) som dämpar de mönster som får prosan att läsa som AI, och tar bort alla "hen". Det här är inte en innehållsomskrivning. Fakta, siffror, formler, struktur och korrekthet rör du inte. Endast rösten kalibreras.

Bakgrund: en testläsare gav omdömet "grym, men lite mindre AI behövs". Målet är att dra ner AI-signaturen, inte att stryka mentor-rösten vi byggde. Källan är enda sanningen, så spelaren ärver fixen automatiskt.

## "Hen" ska bort helt (hård regel)

Ersätt varje "hen", "hens" och "henom". Använd aldrig "han/hon", "han eller hon", eller "denne". Hen-meningarna är nästan alltid den formelmässiga "Hur en erfaren investerare tänker"-mallen, så ta bort hen och bryt mallen i samma drag.

Ersättning, i prioritetsordning:

1. Skriv om till direkt tilltal ("du"). Det är mest levande, passar mentor-rösten, och bryter tredjepersonsmallen. Förstahandsvalet.
2. Skriv om till ett konkret påstående utan pronomen.
3. Behövs en tredjepersonsreferens, använd substantivet, varierat: "en erfaren investerare", "investeraren", "en van placerare". Upprepa inte samma substantiv mekaniskt heller.

Exempel:

- Före: "En erfaren investerare suckar inte åt den höga skuldsättningen, hen vänder direkt till räntebindningen och frågar hur låneboken ser ut i en lågkonjunktur."
- Efter (du): "Stirra dig inte blind på den höga skuldsättningen. Gå direkt till räntebindningen: hur ser låneboken ut i en lågkonjunktur?"

Märk att efter-versionen blev kortare, tappade hen, och tappade samtidigt antites-mallen. Det är hela poängen med att göra det här i ett pass.

## Vad som läser som AI, och ska dämpas (fallande vikt)

1. **Antitesen, om och om igen.** "Det är inte X, det är Y." "Inte X, utan Y." Textens dominerande rytm. Behåll på sin höjd en per lektion, där den verkligen landar. Resten skrivs om till raka påståenden.
2. **Metaprat om sig självt.** Texten berättar hur du ska känna inför det den just sagt: "det fina är att", "poängen är", "lägg märke till vad som hände", "lärdomen är skarp", "det leder till modulens obekvämaste sanning", "det är hela spänningen kursen vill lära ut". Skär det. Säg saken rakt, rama inte in din egen poäng.
3. **Den formelmässiga tankemallen** ("Hur en erfaren investerare tänker", "hen frågar inte X utan Y"). Bryts samtidigt som hen tas bort, se ovan.
4. **Sammanfattningsmeningen sist i varje avsnitt** som städar ihop allt ("det är skillnaden mellan att analysera och att gissa"). Snyggt en gång, mekaniskt var gång. Stryk eller variera.
5. **Treradingen.** "X, Y och Z" i parallell, gärna tre led på rad. Bryt upp, variera antalet.
6. **Småord som fyller rytm:** genuint, faktiskt, just, själva, precis, verkligen. Tunna ut kraftigt.
7. **Den jämna, släta kadensen och överförklaringen.** Allt lika långt, lika balanserat, lika omsorgsfullt avrundat. Variera meningslängden, lämna mer osagt, lita på läsaren, tillåt korta tvära meningar och ibland ett abrupt slut.

## Stilriktning (det positiva, inte bara "ta bort")

- Skriv som en expert som pratar med en skarp junior, inte som en lärobok som berättar om sig själv.
- Lita på läsaren. Säg poängen, rama inte in den.
- Variera rytmen. Korta tvära meningar bredvid längre. Avsluta ibland tvärt.
- Konkret före abstrakt. En bra metafor slår tre.
- Direkt tilltal ("du") där det passar.
- Lämna något osagt.

## Vad som INTE ändras (vakt)

- Inga fakta, siffror, formler, bolagssiffror, korsreferenser eller strukturändringar. De åtta korrekthetsfixarna, formelbilagan, Lifco-datan, sektor-måtten, allt orört. Det här är enbart röst.
- Återinför inga em-dashes eller en-dashes. Dash-grinden står kvar på utdatan.
- Överkorrigera inte till platt och generisk prosa. Behåll värmen, behåll de bästa metaforerna (bara färre), behåll det raka tilltalet.

## Mätbara flaggor

Utöka granskningsskriptet med en rapport per lektion:

- **Hård grind:** antal "hen" måste vara 0. Passar inte förrän det är noll.
- **Rådgivande (smak, inte fakta):** antal antiteser ("inte ... utan", "det är inte ... det är"), träffar på signalfras-listan ("det fina är", "poängen är", "lägg märke till", "lärdomen är", "det är hela spänningen"), småordstäthet (genuint, faktiskt, just, själva, precis, verkligen), och tretalstäthet.

Använd de rådgivande siffrorna för att rikta passet mot de värsta lektionerna först.

Notera att de här flaggorna fångar stilmönster, inte grammatik. Ett rent språkfel som "verka självmål" (det saknas ett "som ett") matchar ingen fras och slinker förbi. Grammatik hanteras i ett eget lager, se nästa avsnitt.

## Grammatik och språkfel (eget lager)

Stilflaggorna ovan kan inte hitta grammatiska fel. Ett saknat ord generaliserar inte till ett mönster du kan matcha. Den sortens fel kräver språklig bedömning, inte nyckelord, och tre lager fångar dem, olika robusta:

1. **Modell-korrektur som ett eget pass.** En modell läser varje mening med en enda uppgift: flagga allt som är ogrammatiskt, saknar ord eller har felaktig kongruens. Den fångar "verka självmål" direkt. Viktigt: det får inte vara samma körning som skrev texten, man korrekturläser inte sitt eget fel bra. Gör det till en separat, oberoende läsning efter röständringen. Det här är huvudmetoden.

2. **LanguageTool (svenska) som deterministiskt nät, om det håller måttet.** LanguageTool är öppen källkod, har svenskt stöd och går att köra lokalt eller via API. Kör ett urval lektioner genom det först och verifiera att det faktiskt fångar riktiga fel, svenskt stöd är tunnare än engelskt. Gör det nytta, lägg in det som ett repeterbart steg utöver modell-korrekturen. Gör det inte det, luta på modell-läsningen och regexen nedan, och hoppa LanguageTool.

3. **Smal regex för en känd felfamilj.** Hårdkoda "verka, verkar, verkade, kännas, känns, te sig" följt av ett naket substantiv utan "som" eller "vara" emellan, och flagga det. Det fångar exakt "verka självmål" och dess kusiner, billigt. Det är whack-a-mole, inte generellt, så det kompletterar lager 1 och 2, ersätter dem inte.

Sammantaget har passet två sorters kontroll. Stilflaggorna (regex, rådgivande) för AI-mönstren, och grammatiklagret (oberoende modell-korrektur, plus LanguageTool om det funkar, plus den smala regexen) för att prosan ska vara språkligt korrekt. Samma uppdelning som hela vägen: deterministiska grindar för det räknebara, en oberoende läsning för det som kräver omdöme.

## Arbetsordning (kalibrera först)

1. Kör flaggan för att se de värsta lektionerna och hen-räkningen.
2. Gör röständringen på en lektion som kalibrering, och kör sedan grammatik-korrekturen (oberoende läsning) på samma lektion. Låt testläsaren läsa. Bekräfta att känslan är "mindre AI", att hen är noll, och att inga språkfel står kvar, innan ni skalar.
3. När lektionen är godkänd, skala lektion för lektion. Efter varje: kör grindarna (hen = 0, inga streck, struktur intakt), grammatiklagret (modell-korrektur, plus LanguageTool och den smala regexen), och stilflaggan för att bekräfta att tätheten sjönk.
4. Spot-kontrollera att inga siffror eller påståenden råkade ändras. Rösten ändras, fakta står still.
