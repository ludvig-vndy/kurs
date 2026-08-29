# Motparten: säljkurs som nytt ben på plattformen

Datum: 2026-08-22. Status: godkänd design, redo för implementationsplan.

Bakgrund: Sebastian Bergs grundprompt "Bygg Sveriges bästa säljsystem" beskriver två
produkter, en utbildning och ett AI-baserat säljsystem. Den här specen gäller endast
utbildningen, och endast dess pilot.

---

## 1. Vad vi bygger

Motparten är en svenskspråkig kurs i försäljning, byggd på samma plattform som
Fundamental aktieanalys men med eget namn, egen URL och eget innehållsbibliotek.

Piloten omfattar två kapitel, nio lektioner, byggda hela vägen till fungerande sida:
kapitel 0, Glöm det du lärt dig, och kapitel 1, Förtroende. Resten av kurskartan är
specad men inte skriven.

### Vad som inte ingår

Grundpromptens fas 3 till 10, alltså AI-coachen, CRM-integration, samtalsanalys,
KPI-motorn, chefslagret, moat-analysen och pilotprogrammet, ligger utanför. De får en egen
spec när kursens färdighetskarta finns, eftersom det är den kartan coachen bedömer mot.

Tre saker i grundprompten bedöms som ogenomförbara som beskrivna och ska inte specas in i
någon produkt utan omarbetning:

- Utsagor av typen "du vinner 41 procent av affärerna där kunden pratar mer än du" kräver
  hundratals affärer per säljare. En enskild säljare gör storleksordningen fyrtio affärer om
  året. På det underlaget är skillnaden brus.
- Realtidsavlyssning av kundsamtal faller på samtyckeskrav och förtroende, inte på teknik.
  Efterhandsinlämning av inspelning, transkribering eller egna anteckningar är det
  realistiska.
- CRM-integration som första datakälla bygger på data som i praktiken är halvifylld och
  inaktuell.

Den ärliga och byggbara versionen av coachen bedömer ett möte i taget mot en tydlig rubrik,
minns vad den sagt förut om samma säljare, och pekar in i kursen. Den påstår inga procenttal.

---

## 2. Kursens tes

**Försäljning är att hjälpa en annan människa fatta ett beslut under osäkerhet, där du är
part i saken.**

Beslut under osäkerhet placerar hantverket i beslutsvetenskap, inte i retorik. Kunden vet
inte om lösningen håller, om du står för det du säger, eller om hen får kritik internt
efteråt. Part i saken är den del som säljkurser hoppar över: du tjänar på ett visst utfall,
kunden vet det, och därför är allt du säger diskonterat från början. Hantverket består i att
bli trovärdig trots att du är part.

Därav en användbar omdefiniering: säljaren sänker kundens upplevda risk minst lika mycket som
hen höjer kundens upplevda värde. Risk blockerar oftare än värde. Människor säger sällan nej
för att de inte förstår värdet. De säger nej för att de inte vågar ha fel.

### De tolv principerna

Utkast, ska granskas av Sebastian. Flera är hantverk och märks som sådana.

1. Du är part i saken. Allt du säger är diskonterat. Trovärdighet byggs med sådant som kostar
   dig något.
2. Kunden köper inte din lösning. Kunden köper ett beslut hen ska försvara inför sig själv
   och andra.
3. Risk blockerar oftare än pris. Priset är det kunden säger, risken är det kunden känner.
4. Ingen ändrar uppfattning för att du argumenterade bättre. Människor ändrar uppfattning när
   de själva formulerar problemet högt.
5. Frågan är säljarens enda verkligt kraftfulla verktyg, och de flesta frågor som ställs är
   påståenden i förklädnad.
6. Lyssnande är inte tystnad. Det är att kunna återge kundens situation bättre än kunden
   själv gjorde.
7. Ett problem utan konsekvens är ingen affär. Det är en observation, och observationer köper
   ingen bort.
8. Värde som kunden inte kan formulera för en kollega existerar inte.
9. Ett ja utan nästa steg är ingenting. Beslut lever i kalendrar, inte i känslor.
10. Att rekommendera bort en kund är den dyraste och mest lönsamma handlingen i yrket.
11. Din nöd syns. Behöver du affären mer än kunden behöver lösningen blir du dyrare att lita
    på.
12. Uppföljning som inte tillför något är inte uthållighet. Det är en avgift du tar ut på
    relationen.

---

## 3. Kurskartan

Piloten är kapitel 0 och 1. Övriga kapitel är specade för att pilotens plats ska vara
tydlig, och skrivs senare.

| Del | Kapitel | Innehåll |
| --- | --- | --- |
| 0. Avlärning | 0 Glöm det du lärt dig | Myterna, egot, definitionen, kontraktet |
| I. Personen | 1 Förtroende | Hur förtroende byggs och rivs, värme mot kompetens |
| | 2 Trygghet och risk | Vad kunden riskerar, status quo som motståndare |
| | 3 Nyfikenhet | Genuint intresse, och varför det inte går att spela |
| II. Samtalet | 4 Frågor | Frågetyper, den obekväma frågan, frågan som inte är ett påstående |
| | 5 Lyssnande | Nivåer av lyssnande, återgivning, det som inte sägs |
| | 6 Problem och konsekvens | Symptom mot orsak, att sätta pris på ett problem |
| III. Beslutet | 7 Värde | Att göra värdet kundens, inte ditt |
| | 8 Beslut och friktion | Beslut under osäkerhet, intressenter, valparalys, nästa steg |
| | 9 Integritet | När du ska säga nej, och vad det gör med långa relationer |
| IV. Yrket | 10 Uppföljning | Uppföljning som tillför värde |
| | 11 Självinsikt | Se sina egna mönster, och bron över till coachen |

Målgruppen är bred, alla som säljer. Principkapitlen hålls därför målgruppsneutrala.
Målgruppsberoende exempel läggs i egna tillämpningsspår senare, inte i fundamenten.

---

## 4. Piloten, lektion för lektion

Varje lektion följer Fokus-formatet, kalibrerat mot vad kursen faktiskt gör i dag och inte
mot CLAUDE.md, som säger 3 till 7 steg medan de 65 befintliga lektionerna ligger på 4 till 14
med median 9. Motparten siktar därför på 6 till 11 steg per lektion, och grinden tillåter 3
till 16 som den befintliga. `visual` är valfri på concept och dataviz. Balansprincipen från
aktiekursen gäller oförändrad: en grafik förtjänar sin plats bara om den visar en form som
prosan inte kan.

Quiz följer befintligt kontrakt utan ändring: exakt ett `quiz`-steg per lektion, med 3 till 6
frågor, varje fråga med `typ` single eller multi, `fraga`, 2 till 4 `alternativ`, `ratt` som
lista och `forklaring`. Tröskel 80 procent. Alla nio lektioner får quiz.

### Kapitel 0: Glöm det du lärt dig

Kapitlets uppgift är att göra plats. Eleven kommer med ett arv av manus, avslutstekniker och
invändningshantering, och en gard uppe. Kapitlet river arvet med belägg i stället för med
attityd, och det är avsiktligt: en avlärning som bara är ett påstående ersätter en myt med
en annan.

**0.1 Vad du blivit lärd, och varifrån det kom.** Färdighet: `grund.avlarning`. Källor: K8,
K13, R5, R7. Manus, alltid-avsluta och invändningshantering uppstod i en värld där säljaren
satt på informationen och köparen inte kunde jämföra. Den världen finns inte kvar.
Reaktansforskningen förklarar varför pressen fungerar sämre än den känns när du använder
den. Lektionen dömer inte ut den gamla skolan som dumhet, den placerar den i sin tid.

**0.2 Myterna som inte håller.** Färdighet: `grund.evidens`. Källor: R1, R2, R3, R4, K11,
K12, K16. Kapitlets tyngsta lektion och kursens metodvisning. Fyra myter tas i tur och
ordning genom `myt`-steget: sju procent-regeln, spegling och NLP, personlighetstyper, och
känsla mot logik. Varje myt får samma behandling: vad påståendet säger, varifrån det kom, vad
studien faktiskt gjorde, och vad som gäller i stället. Att kursen visar sin metod redan i
lektion två är avsiktligt, för allt eleven läser sedan ska läsas med den blicken.

**0.3 Egot i vägen.** Färdighet: `grund.sjalvinsikt`. Källor: K5, K8, K12. Två behov gör
säljare sämre: behovet av att ha rätt och behovet av affären. Båda syns på dig. Här landar
också det motsägelsefulla fyndet att den som ber om råd uppfattas som mer kompetent, inte
mindre, vilket vänder på elevens intuition om att styrka signaleras genom säkerhet.
Personlighetsfyndet hör hemma här: extraversion förutsäger säljresultat dåligt, alltså är
"jag är inte säljartypen" inte ett hinder.

**0.4 Vad försäljning faktiskt är.** Färdighet: `grund.definition`. Källor: K6, K10, K13.
Definitionen byggs från första principer, och status quo-biasen ger den sin skarpaste
konsekvens: din verkliga konkurrent är att kunden gör ingenting. Lektionen introducerar
risk mot värde som kursens bärande spänning.

**0.5 Kontraktet.** Färdighet: `grund.kontrakt`. Inga forskningskällor. Vad kursen lovar,
förståelse och omdöme, och vad den inte lovar, en teknik som får folk att köpa. Hur
evidensnivåerna ska läsas. Vad som krävs av eleven. Motsvarar 0.3 i aktiekursen och ska ha
samma obekväma ärlighet.

### Kapitel 1: Förtroende

Valt som pilotens andra kapitel därför att forskningen är starkast här. Det gör kapitlet till
ett skarpt test av om evidensmärkningen bär, i stället för ett test på lätt mark.

**1.1 Vad förtroende faktiskt är.** Färdighet: `fortroende.grund`. Källor: K1, K2.
Förtroende är viljan att göra sig sårbar, inte en varm känsla. Trovärdighet vilar på förmåga,
välvilja och integritet, och de tre bedöms separat. Värme bedöms först och väger tyngst, för
frågan om du vill kunden väl är mer akut än frågan om du kan.

**1.2 Varför du är diskonterad från start.** Färdighet: `fortroende.varme`. Källor: K1, K2,
K15, K8. Kundens utgångsläge är rimlig misstänksamhet, inte fientlighet. Första intrycket
bildas på tiondelar av en sekund och är trögt att flytta, men det är en beskrivning av
motpartens bias och inte ett skäl att optimera sitt utseende. Det som faktiskt flyttar
bedömningen är signaler som kostar dig något: att säga nej till merförsäljning, att säga att
du inte vet, att lämna en invändning oemotsagd när den stämmer.

**1.3 Hur förtroende rivs.** Färdighet: `fortroende.reparation`. Källor: K3. Kapitlets
starkaste fynd och en riktig aha-lektion. Ett kompetensbrott läses som en händelse, ett
integritetsbrott som en egenskap. Därför fungerar ursäkten olika: den reparerar
kompetensbrott men bekräftar integritetsbrott. Praktiska konsekvensen är obekväm och ska
sägas rakt: den enda hållbara hanteringen av ett integritetsbrott är att inte begå det.

**1.4 Vad du faktiskt kan göra.** Färdighet: `fortroende.handling`. Källor: K4, K5, K7.
Kapitlets handlingsdel. Frågor och följdfrågor höjer upplevd lyhördhet, med brasklappen att
studierna mäter sympati och inte affärer. Att be om råd höjer upplevd kompetens. Trygghet nog
att säga obekväma saker är en förutsättning för att kunden ska berätta det som betyder något.
Lektionen får inte bli en teknikruta, och håller sig därför till varför beteendena fungerar.

Innan 1.4 skrivs ska korrigeringen till Huang med flera (JPSP, mars 2025, doi
10.1037/pspi0000491) kontrolleras. Går den emot huvudfyndet flyttas K4 till nivå B eller ut.

---

## 5. Evidenspolicyn

Registret ligger i `docs/kallor/motparten-kallregister.md` och är sanningskällan. Fyra nivåer:
A robust, B omdiskuterat, C hantverk, Röd avfärdad. En lektion får aldrig påstå
forskningsstöd för något som inte finns i registret.

### Formatkontrakt

Fokus-formatets steg får ett valfritt fält:

```json
"evidens": { "niva": "A", "kalla": "K1", "notering": "Modellen beskriver, den föreskriver inte" }
```

`niva` är ett av `A`, `B`, `C`. För A och B krävs `kalla` med ett id som finns i registret.
För C ska `kalla` utelämnas. `notering` är valfri och används för den viktigaste
invändningen. Fältet renderas som en marginalanteckning.

Ny stegtyp för röda listan:

```json
{
  "typ": "myt",
  "pastaende": "Bara 7 procent av kommunikationen är ord",
  "varifran": "Två labbstudier från 1967 om hur människor tolkar motstridiga signaler om gillande",
  "vad_som_galler": "...",
  "kalla": "R1"
}
```

`myt` renderas som ett eget kort med tydlig visuell skillnad mellan påståendet och
rättelsen. Fälten `pastaende`, `varifran`, `vad_som_galler` och `kalla` är alla obligatoriska.

Läsbara svenska fältnamn gäller som i den befintliga kursen. Inga terse engelska nycklar.

---

## 6. Färdighetstaxonomi

Varje lektion har ett `fardighet`-fält med värde `domän.förmåga` ur en fast lista. Listan bor
i `content/motparten/fardigheter.json` och grinden fäller okända värden.

Domäner, en per kapitel: `grund`, `fortroende`, `trygghet`, `nyfikenhet`, `fragor`,
`lyssnande`, `problem`, `varde`, `beslut`, `integritet`, `uppfoljning`, `sjalvinsikt`.

Syftet är AI-coachen. Den observerar ett beteende, mappar till en färdighet och slår upp
lektionerna. Coachen behöver aldrig läsa kurstexten, och kursen behöver inte veta att coachen
finns. Det är hela kopplingen mellan produkterna, och den kostar ingenting nu.

---

## 7. Rösten

`Hus-stil_rost.md` och `docs/course-style-guide.md` gäller oförändrade. Tilltal med du,
konkreta och kroppsliga bilder, intervall i ord, ojämn rytm, inget metaprat, inga tretal som
manér, inga em-dashes eller en-dashes.

Etablerade engelska facktermer skrivs på engelska, inte i påhittad svensk översättning.
Alltså always be closing, inte "alltid avsluta". Discovery, inte "upptäcktsfas". Regeln
gäller termer som verkligen heter så i yrket; den är inte en ursäkt för svengelska i
löptext, och lånord böjs fortfarande inte.

Mentorbilden byter yrke: en erfaren säljare som lär upp någon på väg att bli riktigt bra,
i stället för en erfaren investerare som lär upp en yngre analytiker. Kalibrering sker mot
Sebastian-stycket i hus-stilen, som är den största spaken. `granska_rost.py` körs på utfallet.

Sebastians personliga stycken lämnas som synliga platshållare i `course.json` tills han
fyllt dem. Kursen kan byggas, granskas och läsas utan dem.

---

## 8. Teknisk arkitektur

### Motorn generaliseras

Tre ingrepp, alla avgränsade:

1. Kursladdningen lyfts ur `src/pages/fokus/*` till en delad modul, `src/lib/kurs.ts`, som
   tar en kursnyckel och returnerar kurs, kapitel, lektion och grannar.
2. Delindelningen, som idag ligger hårdkodad som `delar` i `src/pages/fokus/index.astro`,
   flyttar in i `course.json` där den hör hemma.
3. `src/layouts/Broadsheet.astro` får masthead och accentfärg som props.

Acceptanskriterium för refaktorn: Fokus-kursen renderar identiskt före och efter. Det är
testet på att generaliseringen är korrekt, och det ska verifieras innan säljkursens innehåll
läggs på.

### Nya ytor

- `/motparten`, kursöversikt
- `/motparten/kapitel/[nr]`, kapitelsida
- `/motparten/[lektion]`, spelaren

Innehåll i `content/motparten/`, en JSON-fil per lektion plus `course.json` och
`fardigheter.json`. Samma katalogmönster som `content/fundamental-aktieanalys/`.

Routerna är tunna omslag kring den delade modulen och de befintliga
`src/components/fokus/`-komponenterna. Ingen catch-all på toppnivå, eftersom det skulle
krocka med befintliga sidor.

### Design

Eget namn och egen masthead, ärvd broadsheet-typografi, egen accentfärg. Nytt stilark
`src/styles/motparten.css` som bara sätter om färgtokens. `broadsheet.css` rörs inte.

Accentfärgen väljs i implementationssteg 1 och godkänns av Ludvig innan innehållet läggs på.
Kravet är att den ska stå tydligt mot aktiekursens oxblod och guld utan att lämna
pappersgrunden, så att de två kurserna läses som systrar och inte som samma produkt.

Två nya komponenter: `src/components/fokus/Evidens.astro` för marginalanteckningen och
`src/components/fokus/Myt.astro` för myt-steget. Båda är kursoberoende och kan användas av
aktiekursen senare.

### Åtkomst

### Deploy: två Pages-projekt, ett bygge

Samma `dist` deployas till två Cloudflare Pages-projekt.

- `kurs` till `kurs-7m8.pages.dev`, aktiekursen och Marginalen.
- `motparten` till `motparten.pages.dev`, säljkursen. Skapat 2026-08-29.

```
npm run build
wrangler pages deploy dist --project-name=kurs --branch=main
wrangler pages deploy dist --project-name=motparten --branch=main
```

`--branch=main` är obligatoriskt på båda, annars hamnar bygget i preview.

Mastheaden och innehållet väljs av routen, inte av värden, så båda projekten
innehåller båda kurserna. Det som skiljer är rotens beteende: middlewaren
omdirigerar `/` och `/hem` till `/motparten` när värdnamnet börjar med
`motparten`, så en säljare som får länken landar i sin kurs och inte på
Marginalens landningssida. Regeln matchar på värdnamn och gäller därför även en
framtida egen domän.

Projektet `motparten` har bara `PILOT_SECRET` satt, inga andra miljövariabler.
Varje funktion under `/api/` returnerar därför 501 utan sina hemligheter. För en
pilot är det rätt läge: sajten fungerar, och allt som rör betalning, konton och
AI faller stängt.

### Åtkomst: två produkter, ingen delad session

Delägaren och Motparten är skilda produkter. Beslut 2026-08-29: de delar därför
ingen session. På motparten-värden släpper Delägarens Supabase-JWT inte in, bara
pilotens egen cookie, och pilotcookien öppnar aldrig något på Marginalens värdar.
Middlewaren skiljer på värdnamn, så samma bygge kan serva båda utan att en
prenumerant på den ena kursen får den andra på köpet.

Det avgör inte vem som får köpa vad. Rättigheter per kurs kräver att köpet knyts
till en kurs i Stripe och Supabase, och det är eget arbete med egen spec. Men
skiljelinjen mellan produkterna går att hålla redan nu utan det, och hålls här.

Deploy sker till Cloudflare Pages-projektet `motparten` med
`wrangler pages deploy --branch=main`, från samma bygge som Marginalen.

### Ordlista

Lektionsspelaren renderar marginalglosor genom att matcha termer ur
`src/data/ordlista.json`, som innehåller finanstermer. Den filen är fel för en säljkurs.
Ordlistan blir därför kursberoende, och Motparten får en egen med säljtermer, till exempel
discovery, pipeline, ICP och intressent. Marginalen delas med `evidens`-noteringen: har ett
steg både glosa och evidens renderas evidensen först, och sidoställda takeaways stängs av för
det steget så att marginalen inte får tre saker att bära.

---

## 9. Grinden

`tools/check-motparten.mjs`, ansluten till `npm run check`. Skrivs före innehållet, av samma
skäl som i aktiekursen: en grind som skrivs efteråt hittar aldrig det den skulle ha hindrat.

Den fäller:

1. Ett `evidens.kalla` som inte finns i `docs/kallor/motparten-kallregister.md`.
2. `niva` A eller B utan `kalla`, eller `niva` C med `kalla`.
3. Ett `myt`-steg som saknar något av sina fyra fält.
4. Ett `fardighet`-värde som inte finns i `fardigheter.json`.
5. Em-dash eller en-dash var som helst i innehållet.
6. Frasmönster från röda listan som förekommer utanför ett `myt`-steg, till exempel
   "7 procent", "kroppsspråket står för", "köper på känsla". Träff kräver antingen
   omformulering eller att påståendet flyttas in i ett myt-steg.
7. Lektioner med färre än tre eller fler än sexton steg, och lektioner utan exakt ett
   quiz-steg. Samma tröskel som `check-fokus.mjs`, eftersom grinden i övrigt återanvänder
   den befintliga stegvalideringen.
8. En lektion utan `mal`, `fardighet` eller `titel`.

---

## 10. Leveransordning

1. Generalisera motorn. Verifiera att Fokus renderar identiskt.
2. Utöka kontraktet: `evidens`-fältet, `myt`-stegtypen, de två komponenterna.
3. Skriv grinden och anslut till `npm run check`.
4. Skapa `content/motparten/` med `course.json`, `fardigheter.json` och kapitelstruktur.
5. Skriv kapitel 0, fem lektioner.
6. Skriv kapitel 1, fyra lektioner. Klara ut Huang-korrigeringen först.
7. Röstpass och `granska_rost.py`.
8. Deploy och grindkontroll av åtkomsten.

Steg 1 till 3 är kod och kan testas för sig. Steg 5 och 6 är innehåll och kan skrivas
lektionsvis.

---

## 11. Risker och öppna punkter

**Sebastians bidrag kan dröja.** Hanteras genom platshållare. Kursen blockeras inte.

**Huang-korrigeringen är okänd.** Kontrolleras innan 1.4 skrivs. Går den emot huvudfyndet
flyttas källan ner eller ut, och lektionen skrivs om utan den. Registret är byggt för att
tåla det.

**Bred målgrupp gör exemplen blekare.** Känd avvägning, medvetet vald. Motmedlet är
målgruppsspår senare, inte urvattnade fundament nu.

**Evidensmärkningen kan bli tjatig.** Om varje steg bär en marginalanteckning slutar eleven
läsa dem. Regeln är att märka där påståendet bär lektionen, inte överallt. Följs upp i
röstpasset och justeras efter kapitel 0.

**De tolv principerna är inte granskade av Sebastian.** Flera är hantverk och kan visa sig
vara hans, inte allmängiltiga. Granskning krävs innan kapitel 2 och framåt skrivs.
