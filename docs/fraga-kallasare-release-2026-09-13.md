# Releasekandidat: bevara motparternas originaltext

## Avgränsning

Paketet ändrar den befintliga HTML-läsaren för Frågas motpartsarkiv. Researchpilotens nya modellgranskning, metadatareparationer och OpenAI-anrop ingår inte. Inga nya källadresser läggs till och inget skrivs till produktion under provningen.

Den gamla läsaren kunde dela `Un<strong>ibap</strong>` och `iX<span>5</span>-105`, lämna HTML-kodade minustecken oavkodade, avkoda samma text flera gånger och släppa igenom scriptinnehåll från avklippt HTML. Nya tester reproducerade felen före ändringen.

Läsaren använder nu parse5 7.3.0, redan befintlig transitivt i låsfilen men nu ett explicit låst beroende. Den avkodar HTML en gång, bevarar inline-formaterade ord och skiljer block och tabellceller. Script, style, template, noscript, head och kommentarer behandlas inte som artikelinnehåll. Separata sifferfragment får en gräns så de inte klistras ihop genom markup. En sådan sammanfogning hittades i slutkontrollen och rättades före release.

Detta är textutvinning, inte CSS-rendering, sanitizing eller semantisk faktaverifiering. Okända CSS-regler kan fortfarande påverka sidans visuella ordning. Befintliga gränser för sidstorlek och utdrag gäller. Felaktiga Unicode-kodpunkter blir HTML-parserns ersättningstecken, inte gissade tal.

## Releasefiler

- `motor/bygg-motparter.mjs`
- `motor/lib/motpart-html-text.mjs`
- `tools/__tests__/motpart-html-text.test.mjs`
- `package.json` och `package-lock.json`
- `.github/workflows/motor-nattbrev.yml`

Övriga ändrade/ospårade filer i arbetsgrenen är inte del av detta paket. Nattjobbets befintliga motpartssteg kör `npm ci --omit=dev --ignore-scripts`. Dess `continue-on-error` behålls, så ett fel där inte stoppar brevet eller sparandet av motorns minne.

## Verifiering

Ren installation, fullständigt bygge och repositorykontroller passerade. Den fulla verktygssviten gav 706 godkända och tre överhoppade test, inget fel. Samtliga 17 riktade tester passerade. Slutgranskningen hittade två varianter av numerisk sammanfogning över HTML-gränser; dessa rättades och regressionstester lades till. Den separata granskaren godkände därefter det avgränsade paketet och körde de åtta nya testerna själv.

Integrationstestet följer källtext genom `byggMotparter`, faktaregistret och `lasFaktasvar`. Produktnamn, minustecken, motpartstyp och käll-URL bevaras. Det verifierar källpostens innehåll och märkning, inte modellens tolkning.

Tre sparade originalsidor från Unibap, Space Inventors pressmeddelande och BMIMI kontrollerades. Tolv utvalda bolagsnamn, produkter, datum och belopp fanns kvar med båda läsarna. Detta är kontroll av utvalda uppgifter, inte bevis för fullständig likhet. Råtexten blev kortare när head/metadata togs bort; det är inte en uppmätt minskning av modellkostnad.

Första livekontrollen och kodgranskningen stoppades av användningsgräns, men kunde senare återupptas. Torrkörningen hämtade Loft Orbital: två utdrag, 4 873 tecken, med befintlig markering att HTML-sidan kapats vid storlekstaket. Den befintliga Orbitworks-adressen gav HTTP 404. Det är separat källunderhåll, inte ett parserfel. Ingen KV-skrivning gjordes. Kodgranskningen är genomförd; inga kvarvarande blockerande fynd finns inom läsarändringens avgränsning.

Begränsningar från granskningen: CSS och `hidden` styr inte textutvinningen. Siffror som avsiktligt delas upp med HTML-formatering kan fortfarande få mellanrum, precis som med tidigare läsare. Vi prioriterar att inte sätta ihop skilda sifferfält till nya värden framför att gissa sidans visuella layout.

## Övriga försök, inte release

Researchpilotens whitespace-kontroll återställde samma källstödda post i två sparade körningar utan nya API-anrop. Statusreparationen ändrade endast en underkänd avtalsklassning och krävde full ny granskning. Två liveomprov behöll Unibaps Bifrost-bidrag och tog med det i svaren. Totalkostnad: 0,008860 USD, cirka nio öre vid 10 SEK/USD. Posturval och svarslängd varierade fortfarande; detta är experiment, inte en generell garanti eller produktionsändring.

## Utrullning

Ändringen tillför inget modellanrop per kundfråga. Texten uppdateras först när motpartsarkivet byggs om av nattjobbet. Enbart en Pages-deploy uppdaterar inte KV-innehållet.

Paketet är redo för integration och utrullning inom denna avgränsning; ingen deploy har gjorts. Efter utrullning: kontrollera nattjobbets motpartssteg och märkta källposter. Återgång innebär att återställa paketet och bygga om motpartsarkivet med tidigare läsare. Produktionens siffergrind, modellval och serverrendering ändras inte.

## Integration mot produktionsgrenen

Releasegrenen utgår separat från `origin/trunk` (`318d608`), utan researchpilotens tidigare kodändringar. Den rena releasegrenens svit har 660 godkända tester, noll fel och tre överhoppade; pilotens extra experimenttester ingår inte i denna svit. Repositorykontrollerna passerar.

Ett manuellt `motparter_only`-läge lades till för att aktivera källäsaren utan att köra eller skicka morgonbrevet. Det använder endast Cloudflare-hemligheter och skriver motpartsarkivet. Befintlig gemensam samtidighetsgrupp behålls. Schemalagda körningar och vanliga manuella körningar påverkas inte. Separat kodgranskning fann inga blockerande fel i detta flöde; själva GitHub-körningen verifieras vid utrullningen.
