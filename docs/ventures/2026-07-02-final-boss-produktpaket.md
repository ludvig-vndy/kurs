# Final boss-paketet: från Marginalen till produkt

*2026-07-02. Syntes av Sebastians beställningar (warrantsök, ägar-AI, "designa perfekta produkten först"), Ludvigs/Claudes analyser, och en inventering av vad som redan är byggt. Detta är masterdokumentet: allt annat (spec-dokument, prototyper) hänger under det.*

---

## 0. Paketets innehåll

Detta dokument är index och strategi. Artefakterna som hör till:

| Artefakt | Vad det är | Status |
|---|---|---|
| `docs/ventures/2026-06-30-havstangssok-produktforslag.md` | Full spec för hävstångssöket (data, arkitektur, affär) | Klar som underlag |
| `docs/ventures/2026-06-30-agar-ai-produktforslag.md` | Full spec för ägar-AI:n (AI-arkitektur, datamodell, källor, säkerhet, roadmap) | Klar som underlag |
| `design-explorations/agar-ai-v2.html` | Primär produktmock: förstasida, bolagshubb (lång sida + ankarmeny), rapportanalys, fundamenta, larmgrafer, ägare/insyn/blankning/utdelning. Ljust tema standard, växlare. Live: `/labs/agar-ai-v2.html` | Levande UX-spec |
| `design-explorations/agar-ai-resan.html` | Guidad 90-dagarsdemo med morgonbrevet, kartan och backspegeln. Live: `/labs/agar-ai-resan.html` | Säljdemon (visa denna först) |
| `design-explorations/agar-ai.html` | Äldre helhetsprototyp: onboarding (skäl + gränser) och hävstångsflik | Källa; görs om i v2-formspråk |
| `design-explorations/havstangssok-mock.html` | Klickbar beslutsmotor för hävstång (fristående) | Levande UX-spec |
| `docs/ventures/2026-07-02-designbrief-agar-ai-look-and-feel.md` | Designbriefen: instrumentkänslan, komponenter, språkregler | Styrande för all produkt-UI |
| `design-explorations/agarkollen-karta.html` | Interaktiv funktionskarta över hela huset med korskopplingar och fas-badges. Live: `/labs/agarkollen-karta.html` | Diskussionsverktyg |
| `docs/ventures/2026-07-06-value-proposition.md` | Delbar one-pager: löftet, paketets innehåll med status, trappan, vallgraven | Skickas till externa |
| Marginalen (kursen, live på Cloudflare Pages) | 115 lektioner textkurs + 51 lektioner Fokus-spelare, broadsheet-varumärke, quiz, repetition/SRS, ordlista, Sebastians röst invävd | Byggd, deployad, lösenordsskyddad |
| Marginalen analysverktyg (`/verktyg`) | Checklistedrivet analysverktyg i broadsheet-tema | Byggd |

Sebastians beställningar i original: `Jag vill att du agerar som en världsledande produkt.txt` + tre WhatsApp-skärmdumpar (diamant-resonemanget).

---

## 1. Vad vi faktiskt bygger, i en mening

> **Allt som händer i dina bolag: läst, sorterat och sammanfattat åt dig varje morgon. Säger du dessutom varför du äger, vaktar vi det också.**

Det är hela produkten. Alla ytor är den meningen från olika håll:

- **Onboardingen**: lägg in innehaven, klart, bevakningen startar direkt. Skäl och gränser är ett valfritt lager som AI:n föreslår färdigt (kursens kärnövning "kan du säga det i en mening?" blir en inbjudan, inte ett prov).
- **Förstasidan**: dina bolag, allt väsentligt sammanfattat och bruset bortsorterat. Har du en tes flaggas det som rör den särskilt.
- **Rapportanalysen**: hela rapporten sammanfattad, delta mot 8 till 12 kvartal och konsensus, beräknat i kod, förklarat av AI, allt citerat. Har du en tes får du dessutom svaret på "ändrar det här ditt skäl?".
- **Fråga AI**: grundad chat över dina innehav, med källa, aldrig påhittade siffror.
- **Hävstångssöket**: separat dörr för taktiska lägen, "bäst enligt dina kriterier", aldrig "AI rekommenderar".

Sebastian bad oss designa produkten som får en investerare att känna "jag kan inte investera utan den här längre". Svaret är inte mer data (det är en terminal, det finns redan). Svaret är att produkten **läser allt och skyddar din uppmärksamhet åt dig**, och för den som vill: känner till ditt skäl och vaktar det. Tidsbesparingen är det alla vill ha dag ett. Tesen är fördjupningen som gör tjänsten personlig och som ingen neutral terminal kan kopiera.

**Säljmeningen utåt är Sebastians:** *"Spara maximalt med tid, utan att missa någonting om dina investeringar."* Den förstås på fem sekunder. Skäl-arkitekturen är maskinen som gör den meningen sann, den behöver aldrig nämnas i pitchen.

---

## 2. Principerna (icke förhandlingsbara)

Dessa löper genom kursen, prototyperna och allt som byggs. De är samtidigt produktens moat och dess juridiska skydd.

1. **Siffror är deterministiska, språk är AI.** Tal extraheras ur strukturerad källa, deltan beräknas i kod, LLM:en förklarar men räknar aldrig och minns aldrig tal. Ett verifieringslager korskollar varje numeriskt påstående före visning. En hallucinerad siffra är ett blockerande fel, inte en bugg.
2. **Allt citerat, allt märkt.** Varje påstående länkar till tidsstämplad primärkälla och märks `fakta` (källa), `slutsats` (resonemang) eller `vet ej`. "Vet ej" är en tillåten och inbyggd utväg.
3. **Ägare, inte spekulant.** Dagsavkastningen visas liten med flit. Statusen på förstasidan är bolagets läge i sak (och tesens status när en tes finns), inte kursens. Lugn är en feature: "inget kräver din uppmärksamhet" är ett fullvärdigt svar.
4. **Information, aldrig rådgivning (MiFID II-linjen).** Aldrig "köp/sälj/vad du bör göra". Alltid "vad har ändrats mot ditt skäl" och "vad du kan hålla koll på". Ranking i hävstångssöket är "bäst enligt dina valda kriterier" med synlig formel och justerbara vikter.
5. **Aldrig betald ranking, aldrig såld individdata.** Neutraliteten är varumärket. Intäkt kommer från användare och B2B, inte från emittenter eller annonsörer.
6. **Anti-brus som löfte.** "3 saker rör dina bolag, 47 filtrerades bort" visas öppet. Produkten mäts på hur lite tid användaren behöver, inte hur länge hen stannar.

---

## 3. Diamanten och sekvensen

Tre av fyra idéer är samma produkt: kursen, rapportkollen och innehavs-AI:n delar filosofi, teknik (grundnings-motorn) och tratt. Rapportkollen är ett hjälteflöde i ägar-AI:n, inte ett eget bolag. Warrantsöket betjänar en annan publik (den taktiska tradern) och hålls som separat dörr eller satellit, det tvingas inte in i ägarberättelsen.

**Sekvensen (bit för bit på samma slipning):**

1. **Kursen** (klar): navet, filosofin och kundtratten. Lär dig → öva → äg.
2. **Rapportkollen som fristående smakprov**: minsta sak som bevisar hela tesen. Klistra in en rapport → bra/dåligt/överraskningar/citat, allt grundat. Billigast att bygga, mest på-varumärke, självklar uppgradering från kursen.
3. **Innehavs-AI:n**: när grundningstekniken är bevisad på rapporter, bredda till onboarding (skälet), förstasidan, bevakning och chat. Rapportkollen blir ett flöde i den.
4. **Warrantsöket**: separat, när och om vi vill, för en annan publik. Beslutsmotorn ("Hitta bästa hävstångsprodukten", wizard, dominansfiltrering, "ersätt min produkt") är färdigtänkt och mockad.

Varje steg återanvänder förra stegets spine (grundnings-motor, citat-arkitektur, konton) och förra stegets tratt (kursen). Det är så diamanten byggs utan att bli fyra halvfärdiga stenar.

### Husets karta (innehållet, var allt bor)

**Avsändaren är Marginalen. Tre rum och en sidobyggnad:**

1. **Skolan: kursen** (betald, se beslut 4; första kapitlet gratis som smakprov). 115 lektioner/Fokus, quiz, repetition, ordlistan. Dubbelroll: ordlistan och lektionerna är samtidigt Förklara-AI:ns svarsmotor i tjänsten.
2. **Verktygen från utbildningen** (analysverktyget, checklistorna, formelbilagan): gör-det-själv-bänken. Bor under skolan; på sikt bryggan in i tjänsten: checklistan du fyller i för ett bolag är råmaterialet till "varför äger du det" i Ägarkollen, och kan längre fram ligga i bolagshubben som "din egen analys", förifylld med bolagets siffror.
3. **Tjänsten: Ägarkollen** (arbetsnamn under namnbeslut; betald kärna). Ägarbrevet 07:30, bevakningen med larm, rapportanalysen, bolagshubben, Förklara-AI ("vad menas med det här?").
4. **Sidobyggnaden: warrantverktyget** ("Hitta bästa hävstångsprodukten"). Egen dörr, egen målgrupp, utanför prenumerationen. Fristående gratisverktyg med mäklar-affiliate, länkad från huset men aldrig del av ägarberättelsen.
5. **Upptäcktsdörren: Spaningen** (Ludvigs befintliga momentum-/screeningverktyg). Hittar lägen över ett universum; Ägarkollen analyserar och vaktar det man väljer att äga. Kedjan: Spaningen hittar caset → Tillväxtläget i Ägarkollen tar hand om det. Fristående, egen ton.

**Trappan gratis → betalt:**
- **Gratis (tratten):** kursens första kapitel, det generella Ägarbrevet i Sebastians röst, ordlistan, warrantverktyget.
- **Kursen:** engångsköp (riktmärke 995 till 1 995 kr, testas), och ingår i årsprenumerationen på tjänsten (gör årsköpet självklart).
- **Premium ~199 kr/mån:** personliga Ägarbrevet, bevakningen, rapportanalyserna, Förklara-AI.
- **Pro ~995 kr/mån:** konsensus och multiplar (fas 3-datan), korsrisk, ansvarsliggaren, Sebastians krets.

Poängen med kartan: inget befintligt är vid sidan om. Kursen är svarsmotor, onboarding-data och egen intäkt; verktygen är bryggan till skälet; ordlistan är Förklara-läget; warranten är en egen liten affär som driver trafik till huset.

**Vallgravstesen (Sebastians formulering, antagen 2026-07-06):** sammanfattningar och bevakning blir commodity inom några år, alla kommer ha det. Beteendedatan, skäl, gränser, beslut och avvikelser över tid, blir bara mer värdefull ju längre användaren stannar, och den kan ingen konkurrent replikera. Den kontrafaktiska portföljen kräver både skäl-historik och transaktionshistorik, alltså exakt det tjänsten samlar från första dagen. Bevakningen är inträdesbiljetten. Beteendedatan är vallgraven. Beslut 2026-07-07: tesen är därför ett valfritt lager som AI:n föreslår färdigt, aldrig porten in; beteendedatat byggs ändå från dag ett via beslutsdagboken, impulsbromsen och köp-historiken.

---

## 4. Tillgångsinventering: vad som redan finns och vad det bevisar

**Kursen/Marginalen** (deployad):
- 115 markdown-lektioner i 22 moduler + 51 Fokus-lektioner i 16 kapitel, allt kvalitetsgrindat (`npm run check`), avfluffat och kalibrerat mot husrösten.
- Broadsheet-varumärke (Fraunces/Spectral, papper/oxblod/guld), quiz med 80%-tröskel, repetition (SRS fas 1), ordlista, dashboard.
- Sebastians röst: kapitelnotiser, signerade "Sebastian tänker"-kort, egen lektion 11.5 (hjärnan, tidiga läkemedelsbolag, Intellego-läxan, tålamod).
- **Vad den bevisar:** filosofin finns på pränt, varumärket finns, innehållsmaskinen fungerar, och sifferpolicyn ("hitta aldrig på ett tal") är redan kultur. Kursen är dessutom betaväggen: de första betalande användarna av verktygen finns bland kursens användare.

**`agar-ai.html`** (prototyp, ett sammanhängande flöde):
- Onboarding: lägg in bolag → bevakning och sammanfattningar startar direkt → valfritt: AI-föreslaget skäl med mätbara pelare och larmvillkor att godkänna eller ändra. Kurslänkar invävda (1.1, 11.3, kapitel 10): flywheelen syns.
- Förstasidan: bolagen är sidan. Fem bolag sorterade efter vad som hänt, status som ord (Skälet stärkt/utmanat/Insiderköp/Lugnt), händelsen under sitt bolag, bortsorterat + kommande + portfölj som stillsamma slutrader.
- Aktiesida: Vad har hänt (fakta/slutsats + citat), Rapportanalys (verdikt, delta-grid mot konsensus + trend, bra/dåligt, överraskningar, VD/CFO-citat, "hur det rör ditt skäl"), Ditt skäl (pelare med status och bevis), Fråga AI (grundad chat).
- Hävstång: egen dörr bakom skiljelinje, med ärlig inramning och full beslutsmotor (horisonten styr #1, dominanstabell, ISIN-koll).
- **Vad den bevisar:** hela UX:en och informationshierarkin är designad och känns. Detta är produktspecen, i klickbar form. Det som saknas är backend.

**Spec-dokumenten** (`docs/ventures/`): konkurrensanalys, datakällor, datamodell, AI-arkitektur, säkerhet, skalbarhet, affärsmodeller, roadmap V1 till V4 för båda tjänsterna. Färdiga att exekvera mot.

**Gapet mellan prototyp och produkt** (det som faktiskt ska byggas):
1. Konton och betalning (kursen har idag ett delat lösenord, ingen användarbas i teknisk mening).
2. Grundnings-motorn (ingestion → strukturerad extraktion → deltaberäkning i kod → LLM-narrering → verifiering → citat).
3. Datakällor (se §6).
4. Bevakningsjobb (schemalagd per bolag, larm när en pelare rör sig).

---

## 5. Från prototyp till produkt: byggplanen

### Fas 1: Rapportkollen (smakprovet), cirka 4 till 6 veckor
Den minsta produkt som bevisar tesen, och det första betalbara.

*Scope-val att ta:* trendgrafer kräver att vi backfillar 6 till 8 gamla rapporter per bolag (gratis data, men arbete). Två lägen löser det: "klistra in valfri rapport" funkar för alla bolag utan historik, medan full analys med trender ges för en utvald bolagslista, förslagsvis de bolag betapanelen äger (30 till 50 svenska bolag). Konsensusjämförelser väntar till fas 3; fas 1 jämför mot bolagets egen historik och egen prognos, och det sägs ärligt.

- **Input:** användaren klistrar in en rapport (PDF/URL) eller väljer bolag när rapporten släpps.
- **Pipeline:** strukturerad extraktion av rapporterade tal → delta mot tidigare kvartal (i kod) → LLM narrerar verdikt/bra/dåligt/överraskningar/citat → verifieringslager korskollar varje tal mot extraktionen → output med källhänvisning per påstående.
- **UI:** exakt rapportanalys-fliken i `agar-ai.html`.
- **Kvalitetsgrind före lansering:** en eval-svit med kända rapporter där varje numeriskt påstående verifieras automatiskt. Noll hallucinerade tal är släppkravet, samma anda som kursens grindar.
- **Lansering:** till kursens användare först (beta). Gratis X rapporter, sedan betalvägg.
- **Bevisar:** grundnings-motorn (hela spinen för fas 2), betalviljan, och flödet kurs → verktyg.

### Snittet: kärnan först (sorterat 2026-07-07, på Sebastians fråga)

Listan över allt vi vill bygga är lång; produkten får inte bli det. Sorteringsprincipen är tre frågor: kräver den noll inmatning av användaren? bär den morgonbrevet? kräver den motorn (och är därmed svår att kopiera)? Det ger tre lager:

1. **Kärnan (utan den finns ingen produkt):** morgonbrevet med dedup och väsentlighetsgradering; rapportanalysen; bolagssidan med insynshandel i kontext, blankning, utdelning och kalender förklarat på svenska; tillväxtpaketet (utspädningsvakten, löftesliggaren, emissionshistoriken) som betalningsdrivare; grundad Fråga AI. Allt i kärnan fungerar utan att användaren fyllt i någonting utöver sina innehav.
2. **Fördjupningen (efter beta, förstärker vanan):** tes-lagret (valfritt, AI-föreslaget), rapportförberedelsen, utdelningskollen, impulsbromsen + beslutsdagboken (vallgraven), ljudutgåvan.
3. **Expansionen (Pro/fas 3):** screenern på naturligt språk, portföljröntgen, veckans avvikelser, skattehjälpen, omvärldsbevakningen, kontrafaktiska portföljen.

Orden i produkten följer med: "skäl", "gräns", "vakt" och "tes" är interna begrepp, aldrig inmatningsfält. Användaren möter frågor i klartext: "Varför äger du det?" besvaras med ett färdigt förslag att godkänna, och "gräns" heter "när vi säger till" (se designbriefen §8).

### Fas 2: Bevakningstjänsten (beta), cirka 3 till 4 månader därefter
- Konton + manuell/CSV-import av innehav (ingen broker-koppling i beta).
- Onboardingen: innehav räcker. Allt bevakas och sammanfattas per default, med väsentlighetsgradering (påverkar det vinsten, kassaflödet, utspädningen, ledningen). Skäl + vakter är ett valfritt lager som AI:n föreslår färdigt ur bolagets profil, skäl som utdata i stället för inmatningskrav. Mushiga skäl ("tror på det långsiktigt, stark trend") översätts till vaktbara variabler ("larm om tillväxten viker två kvartal i rad"). Beslutat 2026-07-07 efter Sebastians invändning: folk kan inte formulera skäl dag ett, och ska inte behöva.
- **Teskrossaren i köpflödet:** innan bolaget läggs till bygger AI:n det starkaste motargumentet, ur verifierbara källor (blankningsdata, bolagets egna nyckeltalstrender, riskavsnittet i årsredovisningen). Inga fria "historiska analogier", de hallucinerar.
- **Beslutsdagboken (kärnfunktion, inte verktyg):** varje köp/sälj loggas med motiveringen i stunden, AI:n följer upp mot facit i backspegeln och bygger över tid en bias-profil ("du säljer vinnare tidigt"). Alternativkostnaden mäts i samma liggare mot två speglar: index, och din egen ursprungliga plan (**den disciplinerade tvillingen**). Skillnaden mot tvillingen sätter en krona på vad beteendet kostar, produktens starkaste säljargument. Beskrivning av det förflutna, aldrig uppmaning, där går rådgivningslinjen. Delar datamodell med ansvarsliggaren.
- **Impulsbromsen:** när du är på väg att sälja visas ditt ursprungliga skäl och frågan "vad har ändrats i sak sedan du skrev det här?". Kan du inte svara vet du själv att affären är känslostyrd. Ritual i appen i fas 2, kopplad till själva säljordern när broker-kopplingen finns.
- **Tillväxtläget:** bolag markerade som tillväxtcase får andra default-vakter (runway över 18 månader, utspädningstak, tillväxtgolv, bruttomarginal mot bolagets eget mål), annan mätpanel (kassa, burn, runway i stället för P/E och utdelning), scenariovärdering enligt kursens lektion 12.7 med asymmetrin utskriven, milstolpsbevakning och obligatorisk teskross. Samma motor, annan konfiguration; kursens kapitel 12 är facit. Det är här den stora avkastningen och risken bor, och vakterna är riskbegränsningen. **Tillväxtläget är dessutom go-to-market-spjutspetsen:** segmentet saknar verktyg helt (Börsdata fungerar inte utan vinst, estimat finns inte på småbolagen), betalviljan är bevisad (samma målgrupp köper i dag tipstjänster för 500 till 1 500 kr/mån) och Sebastians publik är exakt den här. Inramningen är "överlev jakten": disciplinen är produkten, drömmen är motivationen. Två bärande funktioner utöver vakterna: **emissionshistoriken** (alla kapitalanskaffningar med kurs och rabatt, ur pressmeddelanden: den mest avslöjande siffran för ett förhoppningsbolag, ingen visar den samlat) och **löftesliggaren**: ledningens egna utfästelser ur gamla pressmeddelanden, systematiskt följda mot utfall ("två av fyra avgjorda löften höll tidplanen"). Rena fakta ur bolagets egna dokument, MiFID-säkert, och omöjligt att kopiera utan extraktionspipelinen. Och **utspädningsvakten**: AI:n läser kallelser till stämmor och prospekt och varnar i förväg för föreslagna bemyndiganden och konvertibelförfall med trolig utspädning. Småbolagsägare bränner sig ständigt på detta, och nästan ingen läser kallelserna. **Det kvalitativa lagret (tillagt 2026-07-07, Sebastians Unibap-exempel):** för ett förhoppningsbolag är tesen en berättelse, inte ett nyckeltal, så motorn måste läsa mer än siffrorna. Tre delar: **casetrappan**, bolagets egen resa i steg (teknik bevisad → betald pilot → certifiering → volymkontrakt → lönsamhet) där varje nyhet placeras på trappan så användaren ser om ett besked flyttar caset eller bara låter bra; **avtalsliggaren**, varje tecknat avtal klassificerat efter vad det faktiskt binder (bindande order, ramavtal, avsiktsförklaring), eftersom småbolags-PM kallar allt "strategiskt samarbete" och skillnaden mellan order och löfte är hela caset; och **positionskollen**, där påståenden om marknadsposition ("pole position inom AI i rymden") grundas mot konkurrenternas offentliga besked i stället för mot bolagets egen retorik. Allt märkt fakta/slutsats med källcitat: en bedömning av vad ett avtal betyder är alltid en slutsats ur citerbara fakta, aldrig fri åsikt. Casetrappan och avtalsliggaren är mockade på Voltcell i v2.
- Morgonbrevet som utskick (mejl/push) och förstasidan i appen.
- **Ägarbrevet som ljud:** samma utgåva som personlig tvåminuterspodd med svensk AI-röst, genererad i samma nattjobb. Rösten läser den redan grindade texten: ljudet läggs efter noll-hallucinationskontrollen och tillför ingen ny riskyta, till skillnad från en fri "prata med AI"-funktion. Levereras i mejlet, i appen och som privat RSS-feed så utgåvan landar i användarens vanliga poddapp, det är där morgonvanan bor (bilen, gymmet, pendeln). Hantverket som avgör: sifferuppläsning normaliseras före TTS ("1,15 kronor" läses som pengar, inte "ett komma femton"), samma röst varje dag (rösten blir varumärke), kort ljudsignatur. Kostnad ören per användare och dag. Vanor är retention: ett mejl skummas, en tvåminuterspodd lyssnas klart.
- Bevakning: pressmeddelanden (MFN/Cision-flöden), FI:s insynsregister, FI:s blankningsregister, rapportkalender, med **deduplicering och gradering**: "17 artiklar i dag, 16 är samma TT-telegram, 1 innehåller ny information". Det är skillnaden mellan brus och tjänst, och ingen svensk aktör gör det bra. Rapportkollen blir rapportanalysen per bolag.
- Bolagshubben enligt v2-mocken: ägare & insyn, blankning, utdelning, kalender och **historik/händelselogg** (uppflyttad från V3, den bär både "allt samlat per bolag" och ansvarsliggaren).
- **Täckningslistan** per bolag: "det här bevakar vi för Norlux", som gör löftet "du missar inget" verifierbart.
- **Rapportförberedelsen:** två dagar före rapport får du nyckelfrågorna: vad ledningen lovade förra kvartalet, hur dina gränser ligger till, blankningsläget. Du går in i rapportdagen förberedd i stället för att reagera efteråt. Konsensusfrågorna tillkommer i fas 3.
- **Utdelningskollen:** tolv månaders kalender över väntade utdelningar med grundad hållbarhetsflagga ur rapporterna ("utdelningen är större än det fria kassaflödet, det brukar inte hålla länge"). Utdelningsjägarna är en stor, lojal och betalningsvillig svensk grupp.
- **Insynskontext:** köp/sälj i relation till personens lön (ur årsredovisningen) och egna historik: "största köpet sedan 2021, tredje på två veckor". Mönstret är värdet, inte händelsen. Fakta-kontext, aldrig rankat "signalvärde" (implicit rekommendation).
- Grundad chat per bolag och över portföljen, plus **Fråga Marginalen v1** (coachen över kursen + ordlistan, se §12) och **Fråga bolaget**: fritextfrågor mot bolagets hela dokumentstack, årsredovisningar, rapporter och prospekt ("hur ser skuldförfallen ut 2027?"), besvarade på sekunder med sidhänvisning. Samma extraktionsmotor som rapportanalysen; AlphaSense och BamSEC gör detta för amerikanska bolag, ingen gör det bra på svenska dokument.
- **Släppkrav:** samma noll-hallucination-grind + att larm bara triggar på materiella händelser (mätt mot en manuellt bedömd facit-vecka).

### Fas 3: Fördjupning (V2/V3 i spec-dokumentet)
Broker-koppling (Tink), estimat/konsensus på riktigt (datalicens), mobil-PWA med push, samt:
- **Omvärldsbevakningen:** det som påverkar ditt bolag utan att bolaget nämns: konkurrenters vinstvarningar, ny reglering för branschen. Kräver bransch- och konkurrentkartor.
- **Veckans avvikelser:** ovanligt hög handel utan nyhet, kursrörelse som avviker från sektorn, korta positioner som byggs upp. Formuleras alltid som fakta ("ovanligt hög handel i går, vi hittade ingen förklaring"), aldrig som signal.
- **Skattehjälpen:** kvittningsmöjligheter och K4-underlag inför årsskiftet, räknat på dina egna affärer. Kräver transaktionshistorik. Säsongsargumentet som säljer abonnemang i november; skatteregler ges alltid som mekanism, aldrig som fryst belopp. (Stämmobevakningen är struken, beslut 2026-07-06.)
- **Portföljröntgen/korsrisk** (Pro): kvalitativ version är grundbar ("tre av dina bolag delar samma slutkund"); kvantifierade fall-scenarier ("62% faller om ...") är pseudoprecision och byggs inte.
- **Screener på svenska** (Pro/expansion): naturligt språk in ("bolag under 5 miljarder som växer över 15%, har nettokassa och insynsköp senaste kvartalet"), lista ut, med förklaring av varför varje bolag matchar och var det haltar. Sänker tröskeln för exakt den community som inte behärskar Börsdata. Kräver fundamenta-licensen; formuleras som objektiv filtrering, aldrig rekommendation.
- **Scenariosimulator:** hävstångsdelen (±1/2/5/10% på underliggande) är deterministisk och kan byggas när som helst; portföljnivån kräver faktormodeller för att vara ärlig och skjuts tills det finns.

### Fas 4: Warrantsöket som satellit (om/när)
Beslutsmotorn är färdigdesignad. Kräver egen datapipeline (emittentfiler, produktlivscykel). Eget varumärke eller tydligt avskild yta, så att ägarberättelsen förblir ren.

---

## 6. Data och kostnader (stegvis, billigt först)

| Steg | Källa | Kostnad | Räcker till |
|---|---|---|---|
| Fas 1 | Rapporterna själva (PDF/IR-sidor), användaren tillhandahåller eller vi hämtar | ~0 kr + LLM-kostnad (ören till enstaka kronor per analys) | Hela rapportkollen |
| Fas 2 | MFN.se/Cision-flöden (pressmeddelanden), FI:s insynsregister, FI:s blankningsregister, Riksbanken/SCB (makro), bolagens IR-kalendrar | I princip gratis (offentliga register och flöden) | Bevakning + morgonbrief |
| Fas 3 | Fundamenta-historik + estimat: Börsdata/Millistream/Infront eller S&P/FactSet | Från hundralappar (privat API) till betydande årslicenser (kommersiellt), förhandlas när intäkt finns | Konsensusdelta, multiplar, korsrisk |
| Fas 2 | Dagliga stängningskurser + fördröjd kursdata (EOD) | Billigt | Faktarad, kurs och sparklines på förstasidan och bolagssidan |
| Fas 4 | Emittenternas dagliga produktfiler + Nasdaq-marknadsdata (fördröjd) | Måttligt + licens | Warrantsöket |

Poängen: **de två första faserna kan byggas nästan utan datakostnad** tack vare Nordens offentliga register. Den dyra datan (estimat, realtid) köps först när betalande användare finns. AI-kostnaden hålls nere genom att analyser görs per bolag och återanvänds av alla som äger bolaget.

---

## 7. Affärsmodell och tratt

**Tratten:** Gratis smakprov → Marginalen-medlemskapet (utbildningen, verktygen ingår) → Pro → B2B.

- **Modellen (Sebastians inriktning, antagen 2026-07-07): vi tar betalt för utbildningen, verktygen ingår.** Ett köpbeslut, en prislapp: du går med i Marginalen och får en matig utbildning, och med den följer verktyg och funktioner du inte kommer kunna vara utan. Verktygen säljs aldrig styckvis; de är skälet att stanna och förnya. Mekaniken under är ett årsmedlemskap, eftersom verktygen har löpande kostnader (data, AI-inferens, drift) som ett rent engångsköp inte kan bära. Förnyelsen motiveras av verktygen plus levande innehåll: coachen, nya moduler, Sebastians genomgångar.
- **Gratis:** kursens första kapitel, det generella Ägarbrevet, ordlistan, N rapportanalyser per månad som smakprov.
- **Medlemskapet, riktpris 1 995 till 2 495 kr/år (motsvarar 166 till 208 kr/mån):** hela utbildningen + personliga Ägarbrevet, bevakningen, rapportanalyserna, tillväxtläget, Fråga Marginalen. Priset testas mot betapanelen.
- **Pro, 499 till 990 kr/mån:** djup historik, export, korsrisk, prioriterad data, ansvarstidslinje, Sebastians månadsgenomgång i liten krets.
- **Senare B2B:** API/white-label av grundnings-motorn och den nordiska händelsedatan; förvaltare/family office-nivå med team och compliance-loggar. Det är den durabla högmarginalintäkten.
- **Warrantsöket:** egen freemium + affiliate till mäklare (aldrig betald ranking).

**Kursens roll i affären:** förtroendebygget och kundanskaffningen. Den som gått kursen har redan formulerat skäl för sina innehav (kursens övningar), alltså exakt onboarding-datat produkten behöver. Kursen och verktygen är samma köp, så tratten har ett enda betalsteg: konverteringen gratis → medlemskap är den första metriken att bevisa.

**Sebastians roll:** rösten och ansiktet. "Sebastian tänker" finns redan i kursen; i produkten blir det trovärdigheten i tonen (morgonbrevets språk, pre-mortem-tänket). Investerar-personan säljer produkten som en AI aldrig kan.

**Morgonbrevet är hooken.** Produktens vana byggs inte av tid i appen utan av ett dagligt brev, 07:30, 90 sekunder, som man till slut vägrar vara utan. Tre beroende-lager: ritualen (dagligt medieformat som kräver noll av läsaren), tryggheten (larmsystemet man inte vågar stänga av när skälen väl är inskrivna) och identiteten (kvartalsbackspegeln och ansvarsliggaren). "Hands off" är produktens resultat, inte dess personlighet: produkten jobbar varje natt, brevet är kvittot.

Brevets struktur, alltid tvådelad:
1. **Dina bolag**: varje innehav med allt väsentligt sammanfattat, och tesens status där en tes finns. Oftast "inget kräver din uppmärksamhet", sagt rakt ut med proof-of-work-raden ("i natt lästes 51 saker, 3 var värda din tid").
2. **Att hålla koll på idag**: det generella (räntebesked, rapportsäsong, makro), men alltid filtrerat genom portföljen med en "för dig"-rad per punkt.
3. På tysta dagar: **dagens Marginal-anteckning**, en lärobit ur kursen eller ett "Sebastian tänker" kopplat till portföljen. Dagligt värde utan fejkad brådska, och kurs-flywheelet blir en daglig muskel.

Tvånivåtratten: ett **gratis generellt morgonbrev** i Sebastians röst (marknaden + en lärdom) som kundanskaffning och distribution, och det **personliga morgonbrevet** (din portfölj, sammanfattningarna, larmen) som betalprodukt. Nyckelmåttet är brevets dagliga öppningsgrad, daglig touch, inte daglig tid.

---

## 8. Mått på framgång (per fas)

- **Fas 1:** andel kursanvändare som testar rapportkollen; andel som kommer tillbaka med rapport nummer två; noll hallucinationsincidenter; betalkonvertering på väggen.
- **Fas 2:** morgonbrevets dagliga öppningsgrad (kärnmåttet); D7/D30-återkomst; andel som aktiverar tes-lagret (fördjupningsmåttet, inte porten); larmprecision (andel larm användaren bedömer som relevanta); churn.
- **Genomgående:** tid till "klar" per session ska vara *låg*. Produkten lyckas när användaren lämnar snabbt och lugn, inte när den scrollar länge.

---

## 9. Risker, rangordnade

1. **Förtroende/hallucination.** Löses arkitektoniskt (§2.1) eller inte alls. Eval-sviten är släppgrinden.
2. **Datakostnad i fas 3.** Hanteras genom att skjuta estimat/realtid tills intäkt finns; Nordens gratisregister bär fas 1 och 2.
3. **Trängsel** (Fiscal.ai, AlphaSense, Quartr, Börsdata). Wedge: Norden + svenska + filosofin + skäl-bevakningen som ingen neutral terminal kan kopiera.
4. **Rådgivningslinjen.** Språkdisciplin (§2.4) + jurist-genomläsning före publik lansering.
5. **Scope-krypning.** Sebastians visioner är 150 funktioner; sekvensen i §3 är skyddet. Allt som inte tjänar meningen i §1 väntar.
6. **Broker-koppling olöst.** CSV först; Tink när det bär.

---

## 10. Nästa 30/60/90 dagar (förslag)

**0 till 30 dagar:**
- Beslut i §11 tas (namn, prissättning-hypotes, roller).
- Bygg grundnings-motorn v0 mot 3 till 5 riktiga rapporter; bygg eval-sviten samtidigt.
- Konton + Stripe på en enkel yta (kan bo under kurs-domänen).
- Rekrytera betapanel via Sebastian, i första hand ägare av tillväxt- och förhoppningsbolag (10 till 20 personer): segmentet med störst smärta, störst betalvilja och noll verktygskonkurrens. Utdelnings- och kvalitetsägarna följer med på köpet, samma motor vaktar båda.

**30 till 60 dagar:**
- Rapportkollen i beta till panelen, ingen betalvägg än; mät och iterera på verdikt-kvaliteten.
- Skriv den publika berättelsen (landningssida: "vi läser allt om dina bolag och sammanfattar det varje morgon, du slipper gräva").

**60 till 90 dagar:**
- Betalvägg på; publik lansering till kurslistan.
- Starta fas 2-bygget (onboarding + förstasida, som redan är designade).

---

## 11. Öppna beslut (Ludvig + Sebastian)

1. **Namn/varumärke:** kandidater framtagna: **Vaka** (rekommenderad: känslan, "vi vakar över dina bolag"), **Ägarbrevet** (tratten, kan även bli namnet på brevet inuti Vaka) och **Bolagskollen** (begripligheten). "Ägar-AI" var arbetsnamn. Viktig flagga: **Marginalen Bank** finns; en betald finanstjänst under namnet Marginalen är en varumärkeskrock i samma bransch. Rekommendation: eget produktnamn med "av Marginalen" som avsändare, PRV/EUIPO-koll via jurist innan låsning. Visuellt är huset sedan 2026-07-07 ett: papper/oxblod-redaktionen är basen för både kursen och tjänsten, med datainstrumenten som funktionslager ovanpå (se designbriefen §4).
2. **Prissättningshypotes att testa i beta (omlagd 2026-07-07 enligt Sebastians modell):** ett årsmedlemskap där utbildningen är det man betalar för och verktygen ingår, riktmärke 1 995 till 2 495 kr/år, plus Pro ~995 kr/mån (Sebastians nivå: konsensus och multiplar när fas 3-datan finns, korsrisk, ansvarsliggaren, månadsgenomgång i liten krets). Grundarpris till de första hundra. Räkneexempel: 1 500 medlemmar à 2 000 kr + 150 Pro à 995 kr/mån är ~4,8 Mkr/år.
3. **Roller och ägande:** vem gör vad (bygge, innehåll, distribution/röst), och bolagsstruktur när betalning slås på.
4. **Kursens betalmodell:** beslutat: kursen är betald, första kapitlet gratis som smakprov, och bundlingen är avgjord genom Sebastians modell (2026-07-07): utbildningen ÄR medlemskapet, verktygen ingår. Inget separat kurspris behövs; kvar att välja är medlemskapets årspris (se beslut 2).
5. **Data i fas 3:** licensiera (Börsdata/Millistream, snabbt och rent) eller bygga egna connectors (billigt, skört). Rekommendation: licensiera när intäkten bär det.
6. **Warrantsöket:** parkeras (rekommenderas tills fas 2 lever), eller startas som satellit med eget namn.

---

## 12. Utbildningen i tjänsten: så kommer Marginalen in

Kursen är inte en granne till tjänsten, den är en komponent i den. Sex konkreta mekanismer, i stigande byggkostnad:

1. **Språket lär ut (byggt).** Trelagersregeln: berättarrösten pratar vardagssvenska, facktermen står i parentes vid första förekomst ("växte av egen kraft, det rapporterna kallar organisk tillväxt"), tabellerna talar rapporternas riktiga språk. Användaren växer genom lagren. Efter tre månader med morgonbrevet kan hen läsa en rapport själv, det är kursens uppdrag i produktform.
2. **Klickbara termer (billig).** Varje term i parentes länkar till ordlistan (finns redan på kurssajten) och vidare till lektionen. "Bruttomarginal" är alltid tre minuter från sin förklaring.
3. **Dagens Marginal-anteckning i morgonbrevet (mockad).** På tysta dagar fylls brevet med en lärobit eller ett "Sebastian tänker", vald utifrån portföljen: äger du en förvärvare får du goodwill-lektionen. Dagligt värde utan fejkad brådska, och kursens 115 lektioner blir en innehållsbank som redan är skriven.
4. **Kontextuella lektioner vid händelser (medel).** När ett larm går följer rätt lektion med: bruten marginalpunkt → lektionen om marginaler; insynsköp → lektionen om insynshandel. Undervisning i det ögonblick användaren är som mest mottaglig.
5. **Kursens övningar blir onboardingens data (medel).** Den som gått kursen har redan skrivit "jag äger en andel av ett bolag som tjänar pengar genom att ...". Det svaret importeras som utgångspunkt när samma bolag läggs in i tjänsten. Kursen fyller i onboardingen.
6. **Kursframsteg styr språknivån (senare, unik).** Den som klarat räkenskapskapitlen får tätare facktermer och färre parenteser; nybörjaren får fler förklaringar. Ingen konkurrent kan kopiera det, för ingen annan äger både skolan och tjänsten.
7. **Fråga Marginalen: coachen.** Samma grundnings-motor, ny korpus: kursens 115 lektioner + ordlistan (v1, redan skriven och kvalitetsgrindad), sedan kurerade Discord-svar från Sebastian och coacherna, sedan transkriberingar (fas 3). Medlemmen frågar fritt och får svar i husets röst med källa; det botten inte kan eskaleras till människa, och människosvaret blir ny korpus. Ersätter tradingcoacher gradvis, inte dag ett. Guardrails: metodfrågor besvaras, positionsfrågor ("ska jag sälja X?") styrs om till processen ("vad var ditt skäl, har det ändrats?"), vilket är bättre coaching än ett ja/nej och håller rådgivningslinjen. Discord-medlemmarnas frågor anonymiseras/destilleras innan de blir korpus (GDPR); coachernas svar används med deras godkännande. Värdet: innehållet är redan producerat och betalt, konkurrenter måste skriva sitt först.

Tratten i andra riktningen: gratisbrevet innehåller en lektion i veckan, kursens första kapitel är gratis, och varje lektionsslut pekar mot tjänsten ("vill du att vi håller koll på det här åt dig?").

**Multibagger-modulen (Sebastians inriktning 2026-07-07): utbildningens verkliga drivare.** Att värdera lönsamma värdebolag på siffror lärs ut i tusen böcker; det säljer inte medlemskap. Det som saknas på svenska är en gedigen utbildning i att analysera bolag utan vinst: hur man fångar och framför allt håller en multibagger. Skriven 2026-07-07 som modul 23 i textkursen, "Att äga ett förhoppningsbolag" (sex lektioner; Fokus-versionen återstår). Innehållet: läsa casetrappan och avgöra var bolaget faktiskt står; skilja bindande avtal från löften i PM-språket; emissioner, runway och utspädning som överlevnadsmått; ledningens löfteshistorik som kvalitetsmått; värdera en berättelse med scenarier och asymmetri (bygger på 12.7); positionsstorlek så det pessimistiska utfallet inte skadar dig (bygger på 11.4); och det svåraste, temperamentet att hålla genom 50-procentiga svängar utan att tesen ändrats, och att sälja när trappan bryts i stället för när kursen svänger. Modulen är också tjänstens manual: casetrappan, avtalsliggaren och löftesliggaren i Tillväxtläget är samma begrepp som verktyg. Utbildning och produkt säljer varandra.

**Rösten i Fokus (Sebastians inriktning 2026-07-07): kursen ska gå att lyssna på, i Sebastians röst.** Video övervägdes och parkerades med motivering: Fokus-spelaren med synkad berättarröst är i praktiken video, grafiken finns redan per steg, och röst följer texten medan video låser den (varje innehållsändring blir en ny syntes i stället för en ominspelning). Rekommenderad väg är hybriden: Sebastian spelar in kapitelintron och Sebastian tänker-rutorna på riktigt (äktheten där den betyder mest), en klonad röst (ElevenLabs eller Azure custom voice, cirka 30 minuters träningsmaterial) läser lektionsstegen. Krav: uttryckligt godkännande, tydlig AI-märkning, och rösträttigheterna reglerade i avtal (in i beslut 3: vem äger klonen om samarbetet ändras). Kedjan är redan byggd och bevisad: motor/fokus-ljud.mjs gör lektions-JSON till uppläsningsmanus genom uttalsnormaliseraren och syntetiserar (demo med Windows-rösten; produktionen byter bara röst på samma manus). Kostnad: hela kursen på 57 lektioner är i storleksordningen en halv miljon tecken, några hundralappar i engångssyntes, ören per uppdatering.

## 13. Saknas-listan: ärlig inventering

**Design/mock (görbart nu, utan beslut):**
- Onboardingen finns bara i gamla formspråket och gamla språket ("tes"); ska göras om i v2-stil med nya orden och kopplas in i v2-mocken.
- Morgonbrevet finns bara i resan-demon; ska in i v2 som egen yta (brevet är ju produkten).
- Hävstångsverktyget ligger i gamla prototypfilen; flyttas in bakom egen dörr i v2 eller parkeras.
- Tomma tillstånd (ny användare, inga innehav), inställningar, mobilvy.
- Landningssida för tjänsten (pelargrafen som hjältebild, Sebastians säljmening).
- Klickbara termer → ordlista (mekanism 2 ovan) i mocken.

**Teknik (fas 1 och 2, planerad i §5, noll byggd):** konton och betalning, grundnings-motorn med eval-svit, datainhämtning (MFN, FI, rapporter), bevakningsjobb, mejl/push-utskick.

**Innehåll:** morgonbrevets redaktionella mallar (tyst dag, larmdag, rapportdag), Sebastians gratis-brev nummer ett, produkt-copyns husstil dokumenterad (trelagersregeln in i designbriefen: gjort), Discord-korpusen till coachen (export, kuratering, anonymisering och coachernas godkännande).

**Affär/juridik (beslut, §11):** namn + varumärkeskoll, MiFID-genomläsning, prishypotesen i betan, bolagsstruktur, betapanelens rekrytering.

## 14. Svar på Sebastians tre stående frågor

**"Hur ser den perfekta produkten ut?"** Den är designad och klickbar: `agar-ai.html`. Öppna den, gå onboardingen, landa på förstasidan, klicka in på Telvio. Det är produkten.

**"Hur blir det ett miljardbolag?"** Inte genom svensk retail-prenumeration ensam. Vägen: äga den grundade nordiska analys- och händelsemotorn (tekniken + datan + förtroendet), bevisa den B2C via tratten, sälja den B2B/API/white-label och expandera geografiskt. B2C bygger tillgången, B2B skalar den.

**"Vad gör att ingen seriös investerare vill vara utan den?"** Inte mer data. Tre saker: (1) den vet *varför du äger* och bevakar just det, (2) den ljuger aldrig om en siffra och visar alltid källan, (3) den ger dig tillbaka tid och lugn i stället för att äta dem. Det är samma tre löften som kursen redan ger, satta i drift.
