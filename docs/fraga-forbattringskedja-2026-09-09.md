# Sex prövade förbättringssteg för analyschatten

Utgångspunkt: `69de416` på `fraga-berakning-prov`. Arbetet gäller den befintliga
chatten och behåller faktaregister, serverberäkning, slutgranskning och budgetar.
Ingen produktionsdeploy. Fem ändringar behålls, ett sökexperiment förkastas.

## Resultat och beslut, steg för steg

| Steg | Hypotes och test | Före | Efter och beslut |
| --- | --- | --- | --- |
| 1. Direkt lektionsval | En uttrycklig hänvisning ska hitta just den lästa lektionen, även utan ämnesord. Prova lektion 5.3, avsnitt 7.2, ogiltigt nummer, datum och okänd undersektion. | ”Förklara lektion 5.3” gav inga lektioner. | Rätt lektion prioriteras. Ogiltiga nummer, datum och 5.3.1 matchar inte en känd prefixlektion. Behåll. |
| 2. Rangordning av kursmaterial | Mer särskiljande ord, eller mindre synonymutvidgning, skulle kunna ge rätt fördjupning till den tidigare avancerade ROIC-frågan. Kravet sattes före försöket: 5.3 bland de två valda. | Frågan fick 2.3 och 4.1; ROIC i djupet saknades. | Frekvensviktning gav 4.1/2.3. En separat variant utan rapportsynonymer gav 2.3/8.1. Ingen variant uppfyllde kravet. Båda återställdes. Ingen förbättring påstås. |
| 3. Fördjupning utan bolagsarkiv | En metodfråga ska kunna läsa mer av befintligt kursmaterial utan att kräva bolagsdokument eller djupläge. | Vanliga frågor utan arkiv saknade las_lektion, även när relevant kursmaterial fanns. | Ett endpointtest ber om 7.2, får verklig lektionstext genom verktyget och lämnar ett granskat svar. Rapportverktyg erbjuds inte utan arkiv. Behåll. |
| 4. Kortning utan falskt formatavslag | JSON-fältens ordning ska inte avgöra om faktaposter bevarats. | Samma post med `{id, typ}` i stället för `{typ, id}` gjorde att en giltig kortning avvisades. | Validerade post-ID:n jämförs i ordning. Identitet, antal och ordning bevaras; borttagen post avvisas. Behåll. |
| 5. Likvärdiga relationsord | Osynliga tecken och kompatibla Unicode-bokstäver ska inte kringgå relationskontrollen. | ”för[osynligt tecken]dubblades” och fullbreddsbokstäver kunde passera ordkontrollen. | Samma normaliserade relationsord ger samma avslag. Vanlig metodtext passerar fortfarande. Behåll. |
| 6. Genomförbar relationsrättning | När felmeddelandet kräver en beräkning måste rättningsvarvet kunna utföra den. | Grinden bad om berakna, men reparationen stängde samtidigt av samtliga verktyg. | Just relationsrättning får högst en beräkning, sedan endast svara. Ett test genomför hela sekvensen. Parallella anrop utför bara en beräkning; andra rättningar får inga extra verktyg. Behåll. |

## Vad testerna bevisar

Varje behållen ändring föregicks av ett test som föll på den gamla koden och
passerade efter rättningen. Befintliga närliggande regressioner kördes efter
varje steg. De nya fallen finns i
`tools/__tests__/fraga-forbattringskedja.test.mjs`.

Endpoint- och looptesterna använder skriptade modellanrop, men den riktiga
verktygskörningen, lektionstexten, registret och svarsvalideringen. De bevisar
att fördjupningen kan hämtas och att rättningen kan utföras. De bevisar inte
hur ofta en verklig modell väljer rätt lektion eller skriver en bättre analys.

Den breda lokala sviten passerade med 567 tester, utan de tre externa
databasetesterna i `isolering.test.mjs`. Dessa har tidigare krävt åtkomst
utanför sandkassan och innehållit separata schemafel; inget sådant fel
rättas eller räknas som löst här. Det sista tillagda ID-gränsfallet körs
dessutom separat efter kodgranskningens rättning.
Den avslutande riktade körningen passerade alla sju nya testfall.
Projektets `npm run check` och `npm run build` passerade också; bygget skapade
278 sidor.

En oberoende kodgranskare kontrollerade ändringarna och prövade flera
parallella beräkningsanrop i reparationsvarvet. Inga kritiska eller viktiga
fynd. Det mindre fyndet om 5.3.1 rättades med ett reproducerande test.

## Kritisk bedömning

De tydligaste förbättringarna gäller åtkomst till underlag och att systemets
egna rättningsinstruktioner går att följa. Kortningsändringen tar bort ett
onödigt avslag utan att släppa på faktakrav. Unicodeändringen täpper till två
konkreta kringgångar, men gör inte ordkontrollen till fullständig
språkförståelse.

Sökningen är fortfarande en svag punkt. Förkastandet av steg 2 är avsiktligt:
ett rimligt sökförslag som inte klarar sitt eget test ska inte räknas som
framsteg. Steg 3 ger modellen möjlighet att korrigera ett dåligt första urval,
men vi vet ännu inte hur ofta den använder möjligheten väl. Extra läsning
kan också öka svarstid och kostnad, inom oförändrade tak.

## Skarpa prov och nästa mätning

Under den första, lokala delen gjordes inga nya betalda modellanrop. Nyckeln fanns varken i
processmiljön eller i projektets `.env`. Det befintliga GitHub-jobbet kan
använda sin hemlighet utan att nyckeln hämtas ut. Automatisk
godkännandegranskning avvisade dock tidigare push till det offentliga repoet
och krävde uttrycklig publiceringstillåtelse. En sådan fråga är ställd och
väntade då på svar. Uppföljningen nedan beskriver godkännandet och de
genomförda skarpa proven; ingen alternativ överföringsväg användes.

Efter publiceringstillåtelsen:

1. Kör samma fasta frågor på basversionen och kandidatversionen med samma
   modell och provdata. Lägg till en direkt lektionsfråga och en metodfråga
   där första kursurvalet inte räcker. Repetera vardera versionen minst två
   gånger för att synliggöra variation; det är fortfarande ett litet prov.
2. Läs samtliga svar. Bedöm sakfel, outtalade premisser, om avgörande underlag
   hämtades, om frågan faktiskt besvarades samt tydlig prioritering av nästa
   kontroll. Godkänd modellgranskning räcker inte som kvalitetsmått.
3. Redovisa blockerade svar, reparationsvarv, ordmängd, antal modellanrop och
   svarstid var för sig. Kontrollera samtliga befintliga positiva/negativa
   granskarpar, inklusive rättningarna från föregående arbetsomgång.
4. Behåll användarbeteendet endast om det hjälper på dessa frågor utan nya
   sakfel eller orimligt mer arbete. Ett sämre utfall ska leda till en
   avgränsad rättning eller återställning, inte en ny allmän promptregel.

Ingen större arkitekturändring behövdes för de fem behållna rättningarna.
En mer omfattande omläggning av sökningen bör presenteras separat om de
skarpa proven visar att det behövs.

## Uppföljning: godkända jämförande API-prov

Användaren godkände publicering och API-prov efter rapporten ovan. Testgrenen
är pushad. Samma provskript på `1ee3ea4` kör sex frågor och tjugotvå kontrollfall
mot dels baslinjens chatbotkod (`69de416`), dels kandidatens (`658b903`).
Arbetsflödet väljer baslinjen med en fast commit och behåller provskriptet.
Två upprepningar per version:

| Version | Körning 1 | Körning 2 |
| --- | --- | --- |
| Baslinje | 34367919071 | 34367952253 |
| Kandidat | 34367935819 | 34367968339 |

Frågorna är de tre tidigare avancerade metodfrågorna, den fiktiva
periodjämförelsen, en direkt fråga om lektion 5.3 och en begäran att använda
läsverktyget för kursavsnitt 7.2. Den sista frågan testar uttrycklig
verktygsanvändning, inte spontan förmåga att välja rätt fördjupning.

Bedömningen skiljer användbara svar från blockeringar och granskarens
kontrollfall från faktiska svarsfel. Svarstid och modellanrop redovisas utan
att uppskattas som pengar, eftersom faktisk fakturering inte hämtas.

### Uppmätt utfall

Alla fyra körningar slutfördes. Jobbloggarna verifierar att de två
baslinjekörningarna återställde `functions/api` från `69de416`.
Provjobbets gröna status är inte ett godkänt kvalitetsresultat.

| Mått, två körningar per version | Baslinje | Kandidat |
| --- | ---: | ---: |
| Frågor som fick svar, oavsett innehållets kvalitet | 7/12 | 10/12 |
| Direkta lektionsfrågor med läst lektion och svar | 0/2 | 2/2 |
| Begärd kursfördjupning med verktyg och svar | 0/2 | 2/2 |
| Öppna metodfrågor som fick svar | 6/6 | 6/6 |
| Periodjämförelsen som fick svar | 1/2 | 0/2 |
| Kontrollfall med förväntat gransknings-/grindbeslut | 43/44 | 42/44 |
| Genomsnittlig svarstid, även blockerade svar | 24,4 s | 28,1 s |
| Modellanrop för de tolv frågorna, kontrollfall exkluderade | 35 | 42 |

Alla frågor och mått finns i `fraga-ab-resultat-2026-09-09.json`, inklusive
den text som användaren skulle ha fått. Jobbloggar:
[baslinje 1](https://github.com/ludvig-vndy/kurs/actions/runs/34367919071),
[baslinje 2](https://github.com/ludvig-vndy/kurs/actions/runs/34367952253),
[kandidat 1](https://github.com/ludvig-vndy/kurs/actions/runs/34367935819),
[kandidat 2](https://github.com/ludvig-vndy/kurs/actions/runs/34367968339).

### Vad som faktiskt förbättrades

Kursåtkomsten klarade båda upprepningarna på båda riktade frågorna.
Baslinjen saknade rätt material och blockerade samtliga fyra försök.
Kandidaten läste rätt material och lämnade svar i samtliga fyra försök.
Det stöder att steg 1 och 3 fungerar i skarp körning, inte bara med skriptad
modell. Det betyder inte att varje formulering i svaren är riktig.

Även den öppna ROIC-frågan ledde till spontan extra läsning i kandidaten:
i ena försöket 7.2, i det andra både 7.2 och 5.3. Baslinjen stannade vid
2.3/4.1 i båda försöken. Möjligheten till fördjupning används alltså även utan
en uttrycklig verktygsorder i just dessa två prov.

Kortningssteget gav inte stabilt korta svar. Den begärda fördjupningen gav
307 respektive 191 ord i kandidaten. ROIC-svaren gav 284 respektive 182.
Det längre ROIC-svaret följde på timeout och fallback till den snabbare
modellen; kortning hoppades över på grund av budget. Ett annat
kortningsförslag avvisades. JSON-ordningsrättningen är mekaniskt verifierad,
men dessa körningar isolerar inte dess effekt på svarslängd.

### Kvarvarande fel, manuellt lästa

- Båda kandidatförsöken räknade periodserien korrekt, men publiceringen
  stoppades efter trasig prosa i rättningsvarvet. Ett försök innehöll
  backspace-tecken och det andra trasiga escape-sekvenser. Det var inte ett
  beräkningsfel. Samma problem förekom i en baslinjekörning. Steg 6:s
  specifika fall, saknad beräkning vid rättning, isolerades inte här eftersom
  beräkningen redan var utförd. Det steget har därför fortsatt bara lokalt
  belägg för sin effekt.
- Ett kandidat-ROIC-svar skrev att avkastning som sjunker **mot eller under**
  kapitalkostnaden är värdeförstörande och förklarade längre ned korrekt att
  avkastning över kostnaden fortfarande skapar värde. Granskaren missade
  motsägelsen. Ett annat skrev att återinvestering blir sämre redan när
  avkastningen **närmar sig** kapitalkostnaden, utan tillräckliga villkor.
- Båda baslinje-ROIC-svaren använde **underifrån** i en riktning som gav
  fel slutsats om värdeförstöring. Felet är alltså inte unikt för kandidaten.
- Kandidatens resonemang om rörelsekapital ställde återkommande
  kapitalbindning mot skalfördelar på ett sätt som inte följer av
  beskrivningen. Dessa kan samexistera. Baslinjen uttryckte den åtskillnaden
  tydligare i de två lästa svaren.
- I ett kandidatkontrollprov godkändes både sammanblandning av operativt och
  investeringskassaflöde och påståendet att uppskjutna leverantörsbetalningar
  höjer marginalen och sänker operativt kassaflöde. Ett baslinjeprov missade
  också det senare. Det är falska godkännanden, inte felaktiga blockeringar.

Skillnaden 43/44 mot 42/44 visar inte att kodändringarna försämrade
granskaren: dess instruktion är densamma, stickprovet är litet och modellen
varierar. Resultatet visar däremot att granskningen inte är tillräcklig som
garanti. Inte heller svarstiderna kan skiljas helt från variation i API-last;
de fyra jobben kördes överlappande.

### Beslut och konkreta nästa prov

Behåll de fem avgränsade kodrättningarna på testgrenen. Kursåtkomsten har nu
även skarpt stöd. Ingen produktionsdeploy gjordes. Hela paketet ska inte
beskrivas som verifierat bättre analyskvalitet: svaren blev mer tillgängliga,
men kvarvarande sakfel och ostabil rättning hindrar den slutsatsen.

Nästa prioriteringar, med prövbara hypoteser:

1. **Stabilisera reparationen för beräkningssvar.** Prova separat om ett
   kort rättningskontrakt som använder den befintliga resultatposten och
   tillåter att den redan besvarar frågan minskar trasig prosa. Samma fasta
   serie och flera upprepningar; godkänt kräver korrekt serverpost, giltig
   text och bibehållen slutgranskning. Gissa aldrig fram skadade ord genom
   strängersättning. Om detta kräver att vi ändrar principen om när prosa
   måste finnas ska designen tas upp före implementation.
2. **Pröva granskning av samband med isolerade kontrastpar.** Utöka proven
   med närmar sig/passerar ovanifrån/passerar underifrån, en text med
   intern motsägelse samt rörelsekapital och skalfördelar samtidigt. Prova
   en ändring i granskningen i taget mot både gamla och nya par. Godkänt
   kräver färre falska godkännanden utan fler felblockeringar. Ytterligare
   en allmän försiktighetsregel är inte i sig evidens för förbättring.
3. **Mät om rätt kursutdrag förbättrar resonemanget.** Kör ROIC-frågan med
   kontrollerat underlag 5.3/7.2 jämfört med det nuvarande första urvalet,
   med samma övriga inställningar. Bedöm de konkreta felsluten ovan och
   svarstid. Det avgör om nästa insats bör ligga i urvalet, modellens
   resonemang eller granskningen, innan sökningen byggs om.
