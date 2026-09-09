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

Inga nya betalda modellanrop gjordes i denna kedja. Nyckeln finns varken i
processmiljön eller i projektets `.env`. Det befintliga GitHub-jobbet kan
använda sin hemlighet utan att nyckeln hämtas ut. Automatisk
godkännandegranskning avvisade dock tidigare push till det offentliga repoet
och krävde uttrycklig publiceringstillåtelse. En sådan fråga är ställd och
väntar på svar. Denna kedjas ändringar har inte pushats som en alternativ väg.

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
