# Ägarkollen · av Marginalen · value proposition och paketets innehåll

*2026-07-06, reviderad 2026-07-07 (medlemskapsmodellen, rapportering först, motorn bevisad i kod). Delbar one-pager. Status per rad: **live** (byggt och deployat), **kod** (körbart, `motor/`), **mock** (klickbart på /labs), **fas 2/3** (planerat, se final boss-dokumentet). Ägarkollen är arbetsnamn.*

---

**Löftet:** *Spara maximalt med tid utan att missa någonting om dina investeringar.*
Allt som händer i dina bolag: läst, sorterat och sammanfattat åt dig varje morgon. Säger du dessutom varför du äger, vaktar vi det också.

---

## Skolan: Marginalen · live
- **Kursen:** 115 lektioner + 51 interaktiva Fokus-lektioner, från "vad är en aktie" till multibagger-analys. Kapitel 1 gratis som smakprov.
- **Quiz, repetition och ordlista**, inbyggt.
- **Analysverktyget:** checklistor för den som vill göra jobbet själv.
- **Multibagger-modulen** *(planerad, utbildningens drivare)*: att analysera bolag utan vinst, hur man fångar och håller en multibagger. Värdebolagsanalys finns i tusen böcker; det här finns inte på svenska. Modulen är samtidigt tjänstens manual: casetrappan och avtalsliggaren är samma begrepp som verktyg.
- *Roll i paketet:* utbildningen är det man betalar för; verktygen nedan ingår och är skälet att stanna.

## Tjänsten: Ägarkollen · mock på /labs

**Dagliga pulsen**
- **Ägarbrevet 07:30** *(mock)*: morgonens utgåva sida för sida. Dina bolag, det allmänna översatt till "för dig", lärobit på tysta dagar, Upptäckten från Spaningen sist och valbar. Beviset varje dag: "i natt läste vi 51 saker, tre var värda din tid."
- **Ljudutgåvan** *(mock)*: samma brev som personlig tvåminuterspodd med svensk AI-röst, i mejlet, i appen och som privat poddfeed. Rösten läser den redan verifierade texten, så ljudet tillför ingen ny riskyta.
- **Allt bevakas utan att du fyller i något:** sammanfattningar och väsentlighetsgradering från dag ett. **Tesen är ett tillval**, inte porten: vill du, föreslår AI:n varför du äger och vad som ska vaktas, färdigt att godkänna. Gränser heter "när vi säger till", aldrig begrepp du måste förstå.
- **Nyhetsbevakning med deduplicering** *(fas 2)*: "17 artiklar i dag, 16 är samma TT-telegram, 1 innehåller ny information."
- **Rapportförberedelsen** *(fas 2)*: två dagar före rapport: vad ledningen lovade sist, dina gränsers läge, blankningen.

**Bolagshubben** *(mock)*
- Allt om ett bolag på en sida: rapportanalys klar minuter efter släppet, kvartalshistorik, ägare & insynshandel med mönster ("största köpet sedan 2021, tredje på två veckor"), blankning, utdelning med hållbarhetsflagga *(fas 2)*, kalender, händelselogg och listan över exakt vad vi bevakar.

**Tillväxtläget** *(mock, go-to-market-spjutspetsen)*
- För bolagen utan vinst, de svåraste att analysera och de sämst betjänade. Kassa/runway-vakt, utspädningstak, scenariovärdering med asymmetrin utskriven, milstolpsbevakning.
- **Casetrappan** *(mock)*: bolagets egen resa i steg (teknik → pilot → certifiering → volym → lönsamhet); varje nyhet placeras på trappan så du ser om ett besked flyttar caset eller bara låter bra.
- **Avtalsliggaren** *(mock + kod)*: varje avtal klassat efter vad det binder: bindande order, ramavtal eller avsiktsförklaring, med bevismeningen ur avtalstexten citerad. Rubriken säger genombrott; vi läser avtalstexten.
- **Löftesliggaren** *(mock)*: ledningens löften ur gamla pressmeddelanden följda mot facit ("två av fyra höll tidplanen").
- **Emissionshistoriken** *(mock)*: alla kapitalanskaffningar med kurs och rabatt.
- **Utspädningsvakten** *(kod)*: läser kallelser och prospekt, varnar för bemyndiganden och konvertibelförfall i förväg, med maxutspädningen räknad i kod.

**Beteendespåret** *(fas 2, vallgraven)*
- **Beslutsdagboken:** varje affär loggad med skälet i stunden, följd mot facit, med bias-profil över tid.
- **Impulsbromsen** *(mock)*: när du vill sälja visas ditt ursprungliga skäl och frågan "vad har ändrats i sak?". Kan du inte svara vet du själv vad affären är.
- **Den disciplinerade tvillingen:** vad hade hänt om du följt din egen plan? Skillnaden sätter en krona på vad beteendet kostar.
- **Teskrossaren:** starkaste motargumentet framletat innan du köper, ur verifierbara källor.

**Fråga & förklara** *(mock)*
- **Förklara-läget:** klicka på vilken term som helst, få vardagsförklaringen + lektionen.
- **Fråga bolaget:** fritextfrågor mot bolagets hela dokumentstack ("hur ser skuldförfallen ut 2027?"), svar på sekunder med sidhänvisning.
- **Coachen** *(fas 1 till 2)*: fritextfrågor mot kursen + kurerade svar från Sebastian och coacherna, med eskalering till människa.

**Onboardingen** *(mock)*: lägg in bolag, klart, bevakningen startar direkt. Steg två är valfritt och förifyllt: AI:ns förslag på varför du äger och tre saker att hålla koll på, med "hoppa över, bevaka allt" som fullvärdig väg.

## Motorn · kod, körbar i repot
Det tekniskt svåraste löftet är bevisat som kod, inte som plan (`motor/`, åtta testlägen gröna):
- **Noll-hallucinationsgrinden:** varje tal i AI:ns text måste matcha ett extraherat faktum eller en beräkning i kod, annars blockeras texten. Sabotagetest ingår: en injicerad påhittad siffra stoppas. Grinden hittade och täppte sitt eget hål (avrundningsmatchning) på verklig data.
- **Verklig data:** Lifcos räkenskapsår 2025 (användarverifierad källa) genom hela pipelinen, 30 av 30 värden korrekt, och en korskontroll som bevisar att rapportens egna procentsatser stämmer med nivåerna.
- **Utspädningsvakten:** stämmokallelse in, bemyndigande + konvertibel + optioner ut med källcitat och sidnummer, maxutspädning räknad i kod.
- **Avtalsklassificeraren:** pressmeddelanden in, avtalsklass ut med bevismening, och proportionerna satta ("det marknadsförda potentiella värdet är 71 gånger den enda bindande ordern").

## Vid sidan om
- **Warrantverktyget** *(mock, inline)*: "Hitta bästa hävstångsprodukten", rankat efter dina val, dominansfiltrering, ISIN-koll. Egen dörr, affiliate-intäkt.
- **Spaningen** *(live, separat)*: hittar aktier som rör sig; Ägarkollen granskar och vaktar det du väljer.

## Grunden · regler i allt
- Siffror kommer ur källdokument, aldrig ur AI:ns minne. Allt har källhänvisning. "Vet ej" är ett tillåtet svar.
- Aldrig köp- eller säljråd. Vi visar vad som ändrats, du bestämmer.
- Klarspråk: vardagssvenska först, facktermen i parentes tills du kan den, tabellerna på rapporternas riktiga språk. Orden "skäl", "gräns" och "tes" är interna, aldrig inmatningsfält.

## Affären · vi tar betalt för utbildningen, verktygen ingår
- **Gratis:** kursens kapitel 1, generella Ägarbrevet i Sebastians röst, ordlistan, warrantverktyget.
- **Medlemskapet, riktpris 1 995 till 2 495 kr/år:** hela utbildningen + personliga Ägarbrevet, bevakningen, rapportanalyserna, Tillväxtläget, fråga & förklara. Ett köpbeslut, en prislapp; verktygen säljs aldrig styckvis, de är skälet att förnya.
- **Pro ~995 kr/mån:** konsensusdata, korsrisk, ansvarsliggaren, Sebastians krets.

## Vallgraven
Sammanfattningar och bevakning blir commodity inom några år. Beteendedatan, skäl, gränser, beslut och avvikelser över tid, blir bara mer värdefull ju längre användaren stannar, och den kan ingen konkurrent replikera. Tesen är frivillig och AI-föreslagen, aldrig porten in; vallgravsdatat byggs ändå från dag ett via beslutsdagboken, impulsbromsen och köp-historiken. **Bevakningen är inträdesbiljetten. Beteendedatan är vallgraven.**

## Byggs härnäst
LLM-extraktion bakom motorns schema (godtyckliga format och riktiga PDF:er, samma facit-eval) · konton och betalning · gratis registerdata (FI, MFN) · mejlutskicket. Fas 1 är rapportanalysen, 4 till 6 veckor.

---

*Klickbart: `/labs/agar-ai-v2.html` (produkten) · `/labs/agar-ai-resan.html` (90-dagarsdemon) · `/labs/agarkollen-karta.html` (funktionskartan). Allt fiktiv exempeldata. Motorn: `motor/README.md`.*
