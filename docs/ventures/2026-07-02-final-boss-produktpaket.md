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
| Marginalen (kursen, live på Cloudflare Pages) | 115 lektioner textkurs + 51 lektioner Fokus-spelare, broadsheet-varumärke, quiz, repetition/SRS, ordlista, Sebastians röst invävd | Byggd, deployad, lösenordsskyddad |
| Marginalen analysverktyg (`/verktyg`) | Checklistedrivet analysverktyg i broadsheet-tema | Byggd |

Sebastians beställningar i original: `Jag vill att du agerar som en världsledande produkt.txt` + tre WhatsApp-skärmdumpar (diamant-resonemanget).

---

## 1. Vad vi faktiskt bygger, i en mening

> **Du säger varför du äger dina bolag. Vi bevakar det skälet dygnet runt och stör dig bara när det rör sig.**

Det är hela produkten. Alla ytor är den meningen från olika håll:

- **Onboardingen**: du sätter skälet i ord (kursens kärnövning, "kan du inte säga det i en mening äger du inte, du gissar").
- **Förstasidan**: dina bolag, sorterade efter vad som rörde dina skäl idag. Resten bortfiltrerat.
- **Rapportanalysen**: ändrar den här rapporten ditt skäl? Delta mot 8 till 12 kvartal och konsensus, beräknat i kod, förklarat av AI, allt citerat.
- **Fråga AI**: grundad chat över dina innehav, med källa, aldrig påhittade siffror.
- **Hävstångssöket**: separat dörr för taktiska lägen, "bäst enligt dina kriterier", aldrig "AI rekommenderar".

Sebastian bad oss designa produkten som får en investerare att känna "jag kan inte investera utan den här längre". Svaret är inte mer data (det är en terminal, det finns redan). Svaret är att produkten **känner till ditt skäl** och skyddar din uppmärksamhet åt dig. Ingen neutral terminal kan göra det, för de vet inte vad du tror.

**Säljmeningen utåt är Sebastians:** *"Spara maximalt med tid, utan att missa någonting om dina investeringar."* Den förstås på fem sekunder. Skäl-arkitekturen är maskinen som gör den meningen sann, den behöver aldrig nämnas i pitchen.

---

## 2. Principerna (icke förhandlingsbara)

Dessa löper genom kursen, prototyperna och allt som byggs. De är samtidigt produktens moat och dess juridiska skydd.

1. **Siffror är deterministiska, språk är AI.** Tal extraheras ur strukturerad källa, deltan beräknas i kod, LLM:en förklarar men räknar aldrig och minns aldrig tal. Ett verifieringslager korskollar varje numeriskt påstående före visning. En hallucinerad siffra är ett blockerande fel, inte en bugg.
2. **Allt citerat, allt märkt.** Varje påstående länkar till tidsstämplad primärkälla och märks `fakta` (källa), `slutsats` (resonemang) eller `vet ej`. "Vet ej" är en tillåten och inbyggd utväg.
3. **Ägare, inte spekulant.** Dagsavkastningen visas liten med flit. Statusen på förstasidan är skälets status, inte kursens. Lugn är en feature: "inget kräver din uppmärksamhet" är ett fullvärdigt svar.
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

---

## 4. Tillgångsinventering: vad som redan finns och vad det bevisar

**Kursen/Marginalen** (deployad):
- 115 markdown-lektioner i 22 moduler + 51 Fokus-lektioner i 16 kapitel, allt kvalitetsgrindat (`npm run check`), avfluffat och kalibrerat mot husrösten.
- Broadsheet-varumärke (Fraunces/Spectral, papper/oxblod/guld), quiz med 80%-tröskel, repetition (SRS fas 1), ordlista, dashboard.
- Sebastians röst: kapitelnotiser, signerade "Sebastian tänker"-kort, egen lektion 11.5 (hjärnan, tidiga läkemedelsbolag, Intellego-läxan, tålamod).
- **Vad den bevisar:** filosofin finns på pränt, varumärket finns, innehållsmaskinen fungerar, och sifferpolicyn ("hitta aldrig på ett tal") är redan kultur. Kursen är dessutom betaväggen: de första betalande användarna av verktygen finns bland kursens användare.

**`agar-ai.html`** (prototyp, ett sammanhängande flöde):
- Onboarding: "Varför äger du bolaget?" → skälet i en mening → mätbara pelare med larmvillkor → pre-mortem → klart. Kurslänkar invävda (1.1, 11.3, kapitel 10): flywheelen syns.
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

### Fas 2: Bevakningstjänsten (beta), cirka 3 till 4 månader därefter
- Konton + manuell/CSV-import av innehav (ingen broker-koppling i beta).
- Onboardingen från prototypen: varför du äger + saker att vakta + gränser.
- Morgonbrevet som utskick (mejl/push) och förstasidan i appen.
- Bevakning: pressmeddelanden (MFN/Cision-flöden), FI:s insynsregister, FI:s blankningsregister, rapportkalender. Rapportkollen blir rapportanalysen per bolag.
- Bolagshubben enligt v2-mocken: ägare & insyn, blankning, utdelning, kalender och **historik/händelselogg** (uppflyttad från V3, den bär både "allt samlat per bolag" och ansvarsliggaren).
- **Täckningslistan** per bolag: "det här bevakar vi för Norlux", som gör löftet "du missar inget" verifierbart.
- Grundad chat per bolag och över portföljen.
- **Släppkrav:** samma noll-hallucination-grind + att larm bara triggar på materiella händelser (mätt mot en manuellt bedömd facit-vecka).

### Fas 3: Fördjupning (V2/V3 i spec-dokumentet)
Broker-koppling (Tink), estimat/konsensus på riktigt (datalicens), earnings-call-läge, portfölj-korsrisk, historik/ansvarstidslinje ("AI:n sa X förra kvartalet, så blev det"), mobil-PWA med push.

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

**Tratten:** Marginalen (kursen) → Rapportkollen (smakprov, freemium) → Innehavs-AI (prenumeration) → Pro/B2B.

- **Gratis:** kursen (eller kursens kärna), N rapportanalyser per månad, 1 bolag bevakat.
- **Premium, riktpris 149 till 249 kr/mån:** obegränsade innehav och rapportanalyser, morgonbrief, skäl-bevakning med larm, chat.
- **Pro, 499 till 990 kr/mån:** djup historik, export, korsrisk, prioriterad data, ansvarstidslinje.
- **Senare B2B:** API/white-label av grundnings-motorn och den nordiska händelsedatan; förvaltare/family office-nivå med team och compliance-loggar. Det är den durabla högmarginalintäkten.
- **Warrantsöket:** egen freemium + affiliate till mäklare (aldrig betald ranking).

**Kursens roll i affären:** förtroendebygget och kundanskaffningen. Den som gått kursen har redan formulerat skäl för sina innehav (kursens övningar), alltså exakt onboarding-datat produkten behöver. Konverteringen kurs → verktyg är den första metriken att bevisa.

**Sebastians roll:** rösten och ansiktet. "Sebastian tänker" finns redan i kursen; i produkten blir det trovärdigheten i tonen (morgonbrevets språk, pre-mortem-tänket). Investerar-personan säljer produkten som en AI aldrig kan.

**Morgonbrevet är hooken.** Produktens vana byggs inte av tid i appen utan av ett dagligt brev, 07:30, 90 sekunder, som man till slut vägrar vara utan. Tre beroende-lager: ritualen (dagligt medieformat som kräver noll av läsaren), tryggheten (larmsystemet man inte vågar stänga av när skälen väl är inskrivna) och identiteten (kvartalsbackspegeln och ansvarsliggaren). "Hands off" är produktens resultat, inte dess personlighet: produkten jobbar varje natt, brevet är kvittot.

Brevets struktur, alltid tvådelad:
1. **Dina bolag**: varje innehav mätt mot dina skäl. Oftast "inget rör ditt skäl", sagt rakt ut med proof-of-work-raden ("i natt lästes 51 saker, 0 rör dina skäl").
2. **Att hålla koll på idag**: det generella (räntebesked, rapportsäsong, makro), men alltid filtrerat genom portföljen med en "för dig"-rad per punkt.
3. På tysta dagar: **dagens Marginal-anteckning**, en lärobit ur kursen eller ett "Sebastian tänker" kopplat till portföljen. Dagligt värde utan fejkad brådska, och kurs-flywheelet blir en daglig muskel.

Tvånivåtratten: ett **gratis generellt morgonbrev** i Sebastians röst (marknaden + en lärdom) som kundanskaffning och distribution, och det **personliga morgonbrevet** (din portfölj, dina skäl, larmen) som betalprodukt. Nyckelmåttet är brevets dagliga öppningsgrad, daglig touch, inte daglig tid.

---

## 8. Mått på framgång (per fas)

- **Fas 1:** andel kursanvändare som testar rapportkollen; andel som kommer tillbaka med rapport nummer två; noll hallucinationsincidenter; betalkonvertering på väggen.
- **Fas 2:** andel som skriver in skäl + pelare i onboardingen (kärnhandlingen); morgonbrevets dagliga öppningsgrad; D7/D30-återkomst; larmprecision (andel larm användaren bedömer som relevanta); churn.
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
- Rekrytera betapanel ur kursens användare (10 till 20 personer, gärna via Sebastian).

**30 till 60 dagar:**
- Rapportkollen i beta till panelen, ingen betalvägg än; mät och iterera på verdikt-kvaliteten.
- Skriv den publika berättelsen (landningssida: "du säger varför du äger, vi bevakar skälet").

**60 till 90 dagar:**
- Betalvägg på; publik lansering till kurslistan.
- Starta fas 2-bygget (onboarding + förstasida, som redan är designade).

---

## 11. Öppna beslut (Ludvig + Sebastian)

1. **Namn/varumärke:** kandidater framtagna: **Vaka** (rekommenderad: känslan, "vi vakar över dina bolag"), **Ägarbrevet** (tratten, kan även bli namnet på brevet inuti Vaka) och **Bolagskollen** (begripligheten). "Ägar-AI" var arbetsnamn. Viktig flagga: **Marginalen Bank** finns; en betald finanstjänst under namnet Marginalen är en varumärkeskrock i samma bransch. Rekommendation: eget produktnamn med "av Marginalen" som avsändare, PRV/EUIPO-koll via jurist innan låsning. Visuellt är huset redan tvådelat med avsikt: papper/oxblod för kursen (tidningen), grafit/guld eller ljust instrument-tema för tjänsten (terminalen), samma hus, två uttryck.
2. **Prissättningshypotes att testa i beta:** Premium ~199 kr/mån (brevet, bevakningen, rapportanalys mot egen historik) och Pro ~995 kr/mån (Sebastians nivå: konsensus och multiplar när fas 3-datan finns, korsrisk, ansvarsliggaren, persona-element som månadsgenomgång i liten krets). Grundarpris till de första hundra. De två nivåerna definierar varandra; 1 000 Premium + 200 Pro är ~4,8 Mkr/år.
3. **Roller och ägande:** vem gör vad (bygge, innehåll, distribution/röst), och bolagsstruktur när betalning slås på.
4. **Kursens betalmodell:** förblir kursen gratis tratt, eller blir den del av prenumerationen (bundle)?
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

Tratten i andra riktningen: gratisbrevet innehåller en lektion i veckan, kursen är gratis, och varje lektionsslut pekar mot tjänsten ("vill du att vi håller koll på det här åt dig?").

## 13. Saknas-listan: ärlig inventering

**Design/mock (görbart nu, utan beslut):**
- Onboardingen finns bara i gamla formspråket och gamla språket ("tes"); ska göras om i v2-stil med nya orden och kopplas in i v2-mocken.
- Morgonbrevet finns bara i resan-demon; ska in i v2 som egen yta (brevet är ju produkten).
- Hävstångsverktyget ligger i gamla prototypfilen; flyttas in bakom egen dörr i v2 eller parkeras.
- Tomma tillstånd (ny användare, inga innehav), inställningar, mobilvy.
- Landningssida för tjänsten (pelargrafen som hjältebild, Sebastians säljmening).
- Klickbara termer → ordlista (mekanism 2 ovan) i mocken.

**Teknik (fas 1 och 2, planerad i §5, noll byggd):** konton och betalning, grundnings-motorn med eval-svit, datainhämtning (MFN, FI, rapporter), bevakningsjobb, mejl/push-utskick.

**Innehåll:** morgonbrevets redaktionella mallar (tyst dag, larmdag, rapportdag), Sebastians gratis-brev nummer ett, produkt-copyns husstil dokumenterad (trelagersregeln in i designbriefen: gjort).

**Affär/juridik (beslut, §11):** namn + varumärkeskoll, MiFID-genomläsning, prishypotesen i betan, bolagsstruktur, betapanelens rekrytering.

## 14. Svar på Sebastians tre stående frågor

**"Hur ser den perfekta produkten ut?"** Den är designad och klickbar: `agar-ai.html`. Öppna den, gå onboardingen, landa på förstasidan, klicka in på Telvio. Det är produkten.

**"Hur blir det ett miljardbolag?"** Inte genom svensk retail-prenumeration ensam. Vägen: äga den grundade nordiska analys- och händelsemotorn (tekniken + datan + förtroendet), bevisa den B2C via tratten, sälja den B2B/API/white-label och expandera geografiskt. B2C bygger tillgången, B2B skalar den.

**"Vad gör att ingen seriös investerare vill vara utan den?"** Inte mer data. Tre saker: (1) den vet *varför du äger* och bevakar just det, (2) den ljuger aldrig om en siffra och visar alltid källan, (3) den ger dig tillbaka tid och lugn i stället för att äta dem. Det är samma tre löften som kursen redan ger, satta i drift.
