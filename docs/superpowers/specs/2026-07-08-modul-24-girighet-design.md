# Design: Modul 24, Girighet och att säkra avkastning

Datum: 2026-07-08
Status: godkänd båge, väntar spec-granskning
Gren: ux-broadsheet-pass (arbetsmaterial), levereras mot trunk

## Bakgrund och syfte

Sebastian bad om "ett riktigt starkt kapitel om girighet". Kärntesen: *there is no good in greed*. Kapitlet ska ge läsaren tre förmågor:

1. **Identifiera önsketänkande**, skilja övertygelse (tes med falsifieringsvillkor) från hopp (narrativ som lever på priset).
2. **Veta när man ska sälja eller stretcha** (låta löpa), som ett medvetet val, inte en känsloreaktion.
3. **Jämföra scenarier**, ställa ångern över förlorad uppsida mot tryggheten i säkrad avkastning, så beslutet blir en vägning i stället för en storm.

Detta är den känslomässiga tvillingen till modul 16 (rädsla, sunk cost, ankring) och till 18.3 (de mekaniska säljskälen). Modul 24 lär ut temperamentet och scenariologiken kring girighet, inte samma sälj-mekanik en gång till.

## Placering och integration

- **Ny modul 24**, egen del `"Girighet och att säkra avkastning"` (samma text som modultiteln), enligt mönstret att modulerna 20 till 23 var för sig är egna delar. Sist i kursen, efter modul 23.
- Mapp: `src/content/kurs/24-girighet-och-att-sakra-avkastning/`.
- Frontmatter följer schemat i `src/content.config.ts`: `del, modul, modulTitel, lektion, titel, niva, ordning, fardighet, format, quiz[]`.
- `ordning`: 2401 till 2406 (samma mönster som modul 23 använder 23xx). Modul-, del- och grannträd byggs automatiskt av `src/lib/course.ts` ur frontmatter; ingen kodändring krävs.
- **Modul-gating**: nya moduler gejtas automatiskt bakom föregående enligt befintlig logik. Ingen åtgärd.
- `niva`: "Avancerad" genomgående (ligger sist, bygger på hela kursen).

## Lektionsbåge (6 lektioner)

Alla standardlektioner måste passera `tools/check-structure.mjs`: de sex H2-sektionerna (Varför det spelar roll, Så fungerar det, Hur en erfaren investerare tänker, Exempel, Vad du letar efter och vad som varnar, Checklista och övning), 700 till 1600 ord, quiz med minst 3 frågor. Syntesen undantas från struktur- och quizgrinden.

### 24.1 Girigheten och varför den kostar (standard)
`fardighet`: Du känner igen girigheten i dig själv och förstår varför den, obehandlad, äter avkastning.
- Girighet som rädslans tvilling: båda är känslor som kapar ett förbestämt beslut i stunden.
- *There is no good in greed*: girigheten lovar mer men levererar sämre beslut. Den vill alltid ha sista kronan.
- Hur den yttrar sig konkret: hålla för toppen, fylla på en vinnare förbi tesen, vägra säkra, jaga tillbaka en missad rörelse.
- Sätter modulens ryggrad och pekar mot 24.4 (scenariojämförelsen) som motgiftet.

### 24.2 Önsketänkande: när tesen blir luft (standard)
`fardighet`: Du kan upptäcka när din tes tyst har bytts ut mot hopp.
- Skilja övertygelse från hopp. Tecknen på att tesen blivit luft: du kan inte längre formulera falsifieringsvillkoret (18.2), värdet motiveras bara av priset (12.3), du citerar trenden och inte siffrorna (16.4).
- Länkar till 16.4 (story investing), 16.5 (potential vs sannolikhet), 15.2 (felmarginal).
- Testet: "vad skulle få mig att sälja?" Om svaret försvunnit äger du hopp, inte en tes.

### 24.3 Den paraboliska uppgången: mönstret och varningsklockorna (standard)
`fardighet`: Du känner igen den paraboliska rörelsens mönster och dess varningsklockor.
- Mönstret: kraftig uppgång på en obevisad trend, börsvärde löst från verksamheten.
- Varningsklockorna: framflyttad rapport som öppnar insynssäljfönster, riktad emission och utspädning, kassabrist och burn (kopplar 19.6, 17.4).
- **Namngivet case: Sivers Semiconductors**, med daterade, källhänvisade tal (se Källor och sifferpolicy nedan). Enda namngivna verkliga bolaget i modulen.
- Citerad forskning om base rates och mean reversion efter paraboliska rörelser.

### 24.4 Scenariojämförelsen: ånger vs säkrad avkastning (standard)
`fardighet`: Du kan ställa ångern över missad uppsida mot tryggheten i säkrad avkastning och fatta beslut på vägningen.
Flaggskeppslektionen. Ramen i fyra steg:
1. **Rita de tre utfallen** från dagens pris: upp, platå, tillbaka. Ärliga grovtal, inte falsk precision.
2. **Prissätt ångern åt båda håll**: ångern om du säljer och den fortsätter upp, och ångern om du håller och den kollapsar. Girigheten ser bara den första.
3. **Väg mot värdet, inte mot toppen** (16.6). "Skulle jag köpa till dagens pris nu?" applicerat på att behålla.
4. **Välj handtag: säkra, stretcha eller dela.** Trimma till en nivå där båda ångrarna blir uthärdliga.
- Stöd: en tydligt märkt **illustrativ** förväntat-värde-räkning som visar varför säkra-en-del ofta dominerar när priset sprungit långt förbi värdet.
- Här bor verktygsskissen (se nedan).

### 24.5 Att säkra eller stretcha: beslutsregeln (standard)
`fardighet`: Du väljer medvetet mellan att säkra, stretcha och dela, styrt av pris mot värde.
- Själva beslutsregeln: när säkra (trimma eller sälj), när det är rationellt att låta stretcha.
- "House money"-villan ärligt granskad: en vinst gör inte kapitalet mindre verkligt.
- Delförsäljning och trappor som svar som gör dig immun mot bådas värsta utfall.
- Citerad disposition-effekt-forskning, med nyansen mot den paraboliska specialsituationen (dispositionseffekten säger att folk säljer vinnare för tidigt; parabeln på luft är undantaget där det ändå är rätt att säkra). Kopplar 18.3.

### 24.6 Syntes: så håller du girigheten i schack (syntes)
`fardighet`: Du har en förbestämd rutin som håller girigheten utanför säljbeslutet.
- Knyter ihop 24.1 till 24.5, checklista och övning.
- Kopplar tillbaka till 18.3 (bevaka, ompröva, sälja) och modul 16 (systemet).
- Format `syntes`, undantas struktur- och quizgrinden.

## Flaggskeppsramen (24.4) i detalj

Scenariojämförelsen är kapitlets bärande idé. Den gör en känslostorm till en vägning:

- **Två sorters ånger, inte en.** Girigheten ser bara ångern över såld uppsida. Ramen tvingar fram den andra ångern, den över hållen kollaps, och ställer dem sida vid sida.
- **Ankaret är värdet, inte toppen.** Beslutet vägs mot beräknat värde (modul 12 till 14), aldrig mot den högsta kurs som synts.
- **Delförsäljning som dominerande drag.** När priset sprungit förbi värdet gör en trim dig immun mot bådas värsta fall: du har säkrat något om den faller, och äger något om den stiger.
- **Illustrativ EV-räkning.** Ett konstruerat, tydligt märkt exempel som visar logiken. Inga påstådda empiriska procentsatser i själva räkningen.

## Verktygsskiss: "Säkra eller stretcha"-kalkylator (Marginalen-verktyget)

Kort spec som underlag för en framtida bygg-session. Byggs inte nu.

- **Syfte**: gör 24.4:s ram körbar i Marginalen-verktyget (`/verktyg`).
- **Input**: dagens pris, ditt värdeintervall (låg till hög), positionens vikt i portföljen, grovodds för de tre utfallen (upp/platå/tillbaka) med grov målkurs per utfall.
- **Output**:
  - Förväntat värde för tre handlingar: håll allt, säkra allt, dela.
  - De två ångertalen sida vid sida (ånger vid såld uppsida, ånger vid hållen kollaps).
  - En föreslagen trim-nivå (öppen fråga: ge tydlig rekommendation "trimma X procent" eller bara lägga fram talen; användaren korrigerar efter första utkast).
- **Avgränsning**: ren räknare på användarens egna antaganden, inga marknadsdata, ingen fabricerad statistik. Detta håller den inom sifferpolicyn.
- Specen skrivs som eget avsnitt i leverans, inte kod.

## Källor och sifferpolicy

- **Sivers (24.3)** är enda namngivna verkliga bolaget. Alla tal ska vara daterade och källhänvisade, verifierade mot primär eller trovärdig sekundärkälla innan de skrivs. Kandidatkällor från research:
  - Framflyttad rapport och insynssäljfönster: Placera, EFN, Affärsvärlden (2026-07-06).
  - Kurs, börsvärde, uppgångens storlek: kontrolleras mot en tydlig källa vid skrivning (siffrorna i första researchsvepet var motstridiga och får inte skrivas overifierade).
  - Verksamhetens svaghet (kassa, förlust, kassaflöde 2025): Dagens PS m.fl.
- Motstridiga tal löses vid skrivning; hellre färre säkra tal än fler osäkra.
- **Citerad forskning (24.3, 24.5)**: mean reversion efter paraboliska rörelser, dispositionseffekten. Riktiga, citerade källor. Verifieras innan de påstås. Där stark evidens saknas faller vi tillbaka på mekanism, inte påhittad procent.
- **Illustrativa exempel** (24.4 EV-räkning, ev. konstruerade fall i 24.1, 24.2, 24.5) märks tydligt illustrativa.
- **Inga em-dash eller en-dash** i något material eller genererad output.

## Grindar och verifiering

Körs innan leverans:
- `npm run check` (integritet, referenser, struktur, dedup). Alla nya standardlektioner måste passera struktur- och referensgrinden.
- `npm run test:tools`.
- `tools/strip-emdash.mjs` och `tools/strip-endash.mjs` vid behov.
- Referenser (16.4, 18.2, osv.) måste peka på existerande lektioner (`check-refs.mjs`).

## Utanför scope (noteras, görs ej nu)

- **Fokus-spelaren (JSON)**: modul 24 transformeras inte till Fokus-format i denna leverans. Fokus är en härledd leverans av kursen; en framtida transform-session får ta modul 24 dit. Noteras i CLAUDE.md-status vid leverans.
- **Bygga verktyget**: bara skiss/spec nu, ingen kod i Marginalen-verktyget.
- Ingen omnumrering eller konsolidering av befintliga moduler.

## Öppna frågor (korrigeras efter första utkast)

1. Verktyget: tydlig rekommendation eller bara talen? (Sebastian lutar mot rekommendation.)
2. Exakt Sivers-sifferset: fastställs vid verifiering mot källa.
3. Modultitelns slutform ("Girighet och att säkra avkastning" vs kortare).
