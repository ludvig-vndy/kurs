# Designbrief: Ägar-AI, look and feel v2

*2026-07-02. Gäller den nya mocken (`design-explorations/agar-ai-v2.html`) och all kommande produkt-UI. Ersätter v1-mockens rena tidningskänsla.*

---

## 1. Vad vi skapar

Ett **instrument**, inte en tidning och inte en terminal. Produkten ska kännas som ett precisionsverktyg en seriös investerare litar på: varje påstående går att verifiera med ögonen inom en sekund, för siffran står bredvid. Känslan vi siktar på: Börsdatas densitet och ärlighet, satt med Marginalens typografi och lugn, med en AI som förklarar men aldrig skymmer datan.

Produktens mening (oförändrad): *du säger varför du äger dina bolag, vi bevakar det skälet och stör dig bara när det rör sig.* Det som ändras är bevisföringen: from prosa som refererar data, till prosa och data sida vid sida.

## 2. Problemet med v1

V1 var för kommunikativ. Allt löstes upp i meningar; siffror fanns bara inuti löptext eller bakom citatklick. Det gav en produkt som *pratar om* data i stället för att *visa* den. En investerare som inte kan skumma talen litar inte på tjänsten, oavsett hur bra prosan är.

## 3. Bärande designprincip

**Slutsats först, bevis bredvid.**

- Prosan säger vad det betyder. Datan bevisar att det stämmer. Båda på samma yta, alltid.
- Varje mening som nämner ett tal har talet synligt intill sig, med riktning (upp/ner), jämförelsepunkt (konsensus, guidning, i fjol, eget snitt) och enhet.
- Deltan skrivs dubbelt: relativt och absolut ("+2,6% mot konsensus" och "2 410 mot 2 350 Mkr").
- Ingen data bakom klick som behövs för att tro på slutsatsen. Klick är för fördjupning, inte för bevis.

## 4. Visuellt språk

**Typografi**
- Fraunces (serif display): rubriker, bolagsnamn, verdikt, citat. Ger rösten.
- Inter: UI, brödtext, etiketter.
- JetBrains Mono med tabulära siffror: **all numerik, utan undantag.** Tal högerställs i kolumner. Enheter och etiketter i 10 till 11 px versal mono med spärrning.

**Färg och tema**
- **Konsolidering till huset (2026-07-07):** tre estetiker (Spaningens kalla terminal, Marginalens varma redaktion, Ägarkollens grafit) blev en. Marginalens oxblod-redaktion är huset; Spaningens datainstrument är funktionslagret ovanpå. Papper #F7F4EC, kort #FCFAF4, oxblod #8A2E26 som varumärkes- och interaktionsaccent (knappar, aktiva lägen, logotyp). Mörkt tema finns kvar som sekundärt val, i varm mörkbrun bas, inte blågrafit.
- Två teman, **ljust som standard** (Sebastians beslut 2026-07-03), växlare i UI, valet sparas. Grafer följer temat via palettobjekt, aldrig hårdkodade färger.
- Färg är betydelse, aldrig dekor: grönt/rött endast för avvikelse mot förväntan eller mot användarens larmvillkor. Neutral data är grå/vit.
- **Guld degraderades från andra brand-färg till en enda betydelse: bevaka/guldläge** (bevaka-status, larmlinjer, tillväxtcasets markör, hävstångens toppval). Aldrig som utfyllnad eller generell accent.
- **Data som mening, inte brus:** råa multiplar som text (P/E 11,2 · Dir 5,8%) läser som fattigt. Varje siffra ska bära kontext: position i eget värderingsspann som band med markör, tesens punkter som chips med status, larmnivån synlig i sifferkortet. Rikedom kommer från betydelse, inte mängd.

**Linjer och ytor**
- Hårlinjer (1 px, #262A30) i stället för lådor. Inga piller, inga färgade kantlister, ingen zebra i tabeller.
- Täthet inuti datablock, luft mellan sektioner. 8 px-grid. En tabellrad får vara 34 till 38 px hög; sektioner separeras med 28 till 36 px.

**Grafenheter**
- **Sparkline**: minsta enheten. Liten (ca 70 x 22 px), enfärgad, utan axlar, inline i tabellrader och bolagsrader. Sista punkten markerad.
- **Pelargraf med larmlinje**: 6 till 8 kvartal av pelarens underliggande mått, med användarens larmvillkor ritat som streckad tröskellinje. Att se kurvan närma sig eller korsa sin egen gräns är produktens starkaste visual.
- Inga grafer utan syfte. En graf finns för att den visar en form prosan inte kan (trend, avstånd till tröskel, jämförelse). Samma princip som kursens grafik-policy.

## 5. Komponentbibliotek (nya byggstenar)

1. **Faktarad**: kompakt strip överst på aktiesidan. Kurs, ±idag, 52-veckorsintervall, börsvärde, P/E, direktavkastning. Mono, avdelare med punkt, dagsförändring dämpad (närvarande, aldrig hjälte).
2. **Datarail**: höger spalt (ca 260 px) bredvid prosa. Staplade datachips: etikett, värde, delta, jämförelsepunkt. Varje chip motsvarar ett tal prosan nämner.
3. **Fundamenta-tabellrad**: metrik | 6 kvartalskolumner | YoY-delta (färgkodad) | sparkline. Hårlinjer, hover-markering.
4. **Delta-grid (rapport)**: utfall | konsensus | delta mot konsensus | i fjol | delta YoY | guidning | trend-sparkline. Avvikelser färgkodade, allt annat neutralt.
5. **Segmenttabell**: segment | omsättning | tillväxt | marginal | marginalförändring.
6. **Multipelblock**: multipel | nu | eget 5-årssnitt | avvikelse mot snittet. Visar dyr/billig mot egen historik, aldrig "köpvärd".
7. **Pelarkort**: pelarnamn + status som ord + aktuellt värde + pelargraf med larmlinje + en rads bevis-text.
8. **Mikronyckeltal**: tre tal i mono under/bredvid en bolagsrad (t.ex. P/E, EV/EBIT, nettoskuld/EBITDA).

## 6. Ytorna

**Idag (förstasidan)**: bolagen är sidan (ligger fast). Varje rad får ett högerställt datablock: kurs + dagsförändring (dämpad), 12-månaders sparkline, tre mikronyckeltal. Raden ska kunna skummas som tabell och läsas som notis. Slutrader (bortsorterat, kommande, portfölj) ligger kvar.

**Aktiesidan / Översikt**: faktarad överst. Sedan tvåfil: prosa vänster (fakta/slutsats-märkt, citerad), datarail höger med de exakta talen. Pelarna under, nu som pelarkort med graf.

**Rapportanalys**: verdikt i en mening överst (serif). Sedan delta-griden i full densitet, segmenttabellen, bra/dåligt tätt i två spalter, överraskningar, VD/CFO-citat, "hur det rör ditt skäl".

**Fundamenta (ny flik)**: kvartals-tabellen (8 till 12 kvartal) med sparklines, sedan multipelblocket mot eget snitt. AI:ns roll här är en kort läsanvisning ovanför tabellen ("det viktigaste i siffrorna just nu"), inte att ersätta den.

**Ditt skäl**: pelarkorten med larmlinje-grafer. Röd pelare visar visuellt var kurvan korsade gränsen.

**Fråga AI**: svar med databilagor: när svaret handlar om tal renderas en minitabell eller sparkline i svaret, med samma komponenter som resten av appen. Fakta/slutsats-märkning och citat ligger kvar.

## 7. Vad som bevaras från filosofin

- Portföljens dagsrörelse nedtonad; hierarkin uttrycker filosofin, inte frånvaron av data.
- Anti-brus: "3 saker rör dina bolag, 47 bortsorterade" är fortsatt synligt.
- Fakta/slutsats/vet ej-märkning och källcitat på varje AI-påstående.
- Lugnet: inga pulserande badges, ingen FOMO-mekanik, inga notisräknare i rött.
- Ingen rådgivning: multiplar jämförs mot egen historik, aldrig mot "borde".

## 8. Språket: tre lager (lika styrande som det visuella)

1. **Berättarrösten:** ren pratsvenska, korta meningar, varierad rytm, inga staplade inskott. Antites-reflexen 'det är inte X, det är Y' är bannlyst som manér; en kontrast får bara stå där kontrasten är själva poängen ('räknat i kod, inte gissat av en AI'). **Noll intern produktjargong**: orden huvudpuls, hands off, hook, flagga, pelare, tes, skäl-som-telegram får aldrig nå användarens skärm. Statusord i klartext: "Ser bra ut", "Något har ändrats", "Lugnt".
2. **Termerna lärs ut, göms inte:** vardagsförklaringen först, facktermen i parentes vid första förekomst ("det rapporterna kallar organisk tillväxt"). Termerna blir klickbara mot ordlistan/lektionerna. Pedagogiken är målet: användaren ska så småningom förstå rapportspråket själv.
3. **Tabellerna:** rapporternas riktiga språk (P/E, EBIT, bruttomarginal). Det är dit användaren ska ta sig.

Frågeförslag i chatten formuleras som en människa ställer dem ("Har något ändrats i mina bolag?", "Äger jag för mycket av samma sak?"), aldrig som funktionsnamn.

## 9. Fas-märkning per komponent (designa inte in olicensierad data)

| Komponent | Datakrav | Fas |
|---|---|---|
| Rapportanalys: utfall, i fjol, egen prognos, trend | Rapporterna själva (+ backfill för trend) | 1 |
| Pelargraf med larmlinje (hjälten) | Användarens inmatning + extraherad historik | 1 |
| Morgonbrev, bevakning, insyn, blankning, utdelning, kalender, historiklogg, täckningslista | Gratis register (FI, MFN) + egen liggare | 2 |
| Faktarad, kurs, 12-mån sparklines | EOD-/fördröjd kursdata (billig) | 2 |
| Konsensuskolumnen, multiplar mot 5-årssnitt | Estimat-/fundamentalicens | 3 (blir Pro-innehåll) |

Mockar får visa målbilden, men varje pitch mot betaanvändare visar bara den fas som byggs.

## 10. Anti-patterns (får inte hända)

- Lådor, piller och färgade kantlister som informationsbärare.
- Färg som dekor eller AI-prosa utan sin siffra intill.
- Grafer som utsmyckning, staplar för staplarnas skull.
- Emoji som ikoner (endast vektorikoner, ett formspråk, 1,6 px streck).
- Tankstreck och halvstreck i copy (kursens regel gäller produkten).
- Intern strategijargong i UI-copy (se §8).
- Påhittade tal: i mockar markeras allt som exempeldata; i produkt kommer varje tal ur källdata via grundnings-motorn.

## 11. Referenser

- **Börsdata**: densitet, tabellärlighet, siffror-först.
- **Koyfin**: faktarad, mörk professionell yta utan Bloomberg-brus.
- **Marginalen (kursen)**: typografi, ton, lugn, guld/grafit.
- Motpol att undvika: generisk dark-SaaS-dashboard med kort, badges och grafer överallt.
