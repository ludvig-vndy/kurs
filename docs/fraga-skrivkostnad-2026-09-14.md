# Kostnadsprov: billig skrivning räcker inte

Den största uppmätta kostnaden finns i undersökningens modellvarv. Ett avgränsat skrivsteg går att köra för ören med en billig API-modell, men proverna visar inte en tillräckligt stabil ersättare. Egenhostad skrivning är tekniskt möjlig; vi har inte provat egen drift eller mätt dess ekonomi.

## Kostnaden i de tidigare fullständiga pilotförsöken

Sju pilotförsök, inklusive fel och avslag, kostade uppskattat 2,56371861 USD. Klassificeringen utgår från faktiska API-svar: undersökningsverktyg, svara, granskning, redigering respektive webbsökning. Ett anrop som lämnar svara räknas till svar/omförsök även om det också innehåller ett annat verktyg. Kostnader för baslinjen ingår inte i denna fördelning.

| Moment | Anrop | Andel kostnad | Kr per pilotförsök, medel |
| --- | ---: | ---: | ---: |
| Undersökning och planering | 32 | 54,6 % | 2,00 |
| Svar och omförsök | 12 | 27,7 % | 1,01 |
| Sakgranskning | 5 | 9,2 % | 0,34 |
| Redigering | 3 | 3,6 % | 0,13 |
| Webbsökning | 10 | 5,0 % | 0,18 |

Av modellkostnaden exklusive sökningen var 89,7 procent indata inklusive cache, 10,3 procent utdata. Det räcker alltså inte att bara korta texten som kunden ser. Modellen måste även få mindre upprepad indata och göra färre onödiga varv.

Om svar, redigering och granskning hade kostat noll, men undersökningen varit oförändrad, hade återstående kostnad varit cirka 2,18 kr per försök. Detta är en beräkning på de gamla körningarna, inte en prognos för en ombyggd motor.

Reproducerbar redovisning: `tools/rapport-fraga-kostnadsdelar.mjs`, med de fyra comparison.json-filerna från den tidigare [kundpilotrapporten](fraga-kundpilot-resultat-2026-09-14.md).

## Det nya, avgränsade experimentet

Två redan undersökta frågor: Unibap/Bifrost och Sivers/POET. Skriptet väljer automatiskt det första sparade granskningsunderlaget per fråga som har externa dokumentposter. Samtliga externa poster därifrån bevaras ordagrant, även sådana som tidigare svar inte använde. Tidigare kundsvar skickas inte in. Samma poster används i alla skrivvarianter, med stabila SHA-256-hashar:

- Bifrost: `2825c9011f634213d84dc051866cdc38222e57fbd103eaeea3bae2dcfb532fae`, tre poster.
- Sivers/POET: `9d38c48a9afa5560f5d68b572807c8903bedbfcd28782f768f5a547ae8fbd338`, fyra poster.

Varje försök skriver med befintligt svara-schema. Samma `lasFaktasvar` kontrollerar format, postreferenser och siffror. Godkända format går vidare till samma `GRANSKA_SYSTEM`, med hela det frysta underlaget. Skrivare och granskare använder samma modell inom ett försök. Ingen extra reparationsrunda ingår i experimentet. Granskarens beslut är ett modellutfall, inte vår kvalitetsbedömning.

Detta är **skrivning och granskning av färdighämtat material**, inte kompletta kundfrågor. Planering, hämtning, hela bolagsarkivet, beräkningar och samtalsminne ingår inte. Frågorna är kända utvecklingsfall, inga undanhållna prov. Det går inte att räkna skillnaden mot tidigare helkedja som en bevisad procentuell produktbesparing.

| Variant, fyra försök vardera | Tid/försök | Kostnad/försök | Modellgodkända efter grindar |
| --- | ---: | ---: | ---: |
| Luna, första instruktionen | 6,2–8,7 s | 2,5–4,2 öre | 3/4 |
| Sonnet, samma instruktion | 13,8–23,7 s | 22,2–31,3 öre | 0/4 |
| Luna, tydligare kortformat och datum | 7,7–10,3 s | 1,6–3,3 öre | 1/4 |
| Luna, kortformat med API-strict | 6,9–9,3 s | 0,9–2,5 öre | 1/4 |
| Sonnet, kortformat med API-strict | 12,9–22,6 s | 20,9–31,1 öre | 0/4 |

Försök som stoppas före granskning saknar den kostnaden. Sonnet fick därför ingen betald sakgranskning i dessa prov; dess siffror får inte presenteras som priset för en fungerande skriv- och granskningskedja. Luna-försök som faktiskt nådde granskning kostade cirka 2,3–4,2 öre inklusive granskaren. Cacheutfall ingår; Sonnet kördes i Actions och Luna lokalt, så svarstiden är inte en ren modellbenchmark.

Totalt för alla tjugo nya skrivförsök: **0,24113714 USD, cirka 2,41 kr**. Detta tillkommer till tidigare pilotprov. Samtliga kostnader använder 10 SEK/USD, leverantörernas rapporterade usage och testets prislista, inte fakturakvitton. [OpenAI-prisunderlag](https://developers.openai.com/api/docs/models/gpt-5.6-luna), [Anthropic-prisunderlag](https://platform.claude.com/docs/en/about-claude/pricing).

## Vad blev bättre och vad blev inte det?

**Verifierad presentationsförbättring i Luna-omprovet:** första varianten lade in långa dokumentblock och slutade på cirka 1 200–1 700 ord. Den tydligare instruktionen tog bort fulltextblocken i samtliga fyra omprov. De formgodkända texterna blev 176–212 ord och behöll stödreferenser. Det är en verklig minskning av onödig kundtext, men ingen bevisad förbättring av analysens riktighet.

**Kvarvarande sakproblem:** Sivers-källan säger att provexemplar har levererats till POET. Luna skriver upprepade gånger att lasrarna har provats hos POET. Provleverans visar inte i sig att kunden har genomfört tester. Tidslinjen för det gemensamma projektet jämförs fortfarande otillräckligt med Sivers bredare kvalificeringsmål. Bifrost-svaren skiljer oftare mellan fungerande satellit/ESM och planerad AI-demonstration, men identifierar inte alltid den äldre källans datum. Ingen stabil kvalitetsvinst godkänns utifrån dessa prov.

**Kvarvarande kontrollproblem:** Sonnet utelämnade version i samtliga första försök; servern avvisade dem. API-strict i omprovet räckte inte för att få samtliga svar genom serverkontrollen. Två Sonnet-svar stoppades för grundform och två för prosa. Vi fyllde inte i saknade fält eller försvagade grinden. Sivers-svar stoppades även för perioduttryck som ”slutet av 2026”, medan ett Luna-svar skrev årtalet med räkneord. Detta behöver skiljas från påhittade ekonomiska belopp vid nästa granskning av kontraktet.

**Granskaren gör också fel:** ett avslag hänvisar till att ett senare POET-besked ligger efter Sivers-källan i tid. Olika publiceringstidpunkter är inte i sig ett sakfel. Ett annat avslag behandlar en uttryckligen villkorad framtida möjlighet som om svaret påstod en bekräftad order. Andra utkast har verkliga problem med rolltillskrivning och stödreferenser. Vi kan därför varken räkna alla godkännanden som kvalitet eller alla avslag som nödvändiga.

## Rekommenderad fortsättning

1. **Optimera undersökningsvarven, där cirka 55 procent av kostnaden låg.** Nästa experiment ska låta planeraren se en kort källkatalog och små verktygsresultat, medan servern behåller fulla dokument. Kör samma frågor genom hela flödet och kontrollera att avgörande källor fortfarande hittas och läses. Förväntad mekanism är mindre upprepad indata; besparingen är ännu inte uppmätt.
2. **Prova billig skrivare separat från granskaren.** Behåll ett komplett, daterat faktaunderlag och jämför samma utkast med en oberoende granskare. Mät sakfel och felaktiga avslag, inklusive provleverans kontra genomfört test, komponentroll och plan kontra utfall. Byt inte båda modellerna i produktion baserat på dessa få prov.
3. **Rätta kontraktsfriktion utan att ge siffror fri lejd.** Kontrollera protokollfält och avgränsade perioduttryck med reproducerade fall och negativa regressioner. Datum får inte bli ett sätt att smuggla in belopp. Det kräver separat verifiering och är inte ändrat här.

En egenhostad modell kan anslutas till samma uppdelning: serverägt underlag → modellens svarsförslag → serverkontroll → sakgranskning. Den kan köras i vår infrastruktur, inte nödvändigtvis hos kunden. Egen drift kräver dock kapacitet för samtidiga frågor, övervakning och underhåll. Ingen modell eller hårdvarukostnad har utvärderats här. Eftersom den billigare API-skrivningen redan ligger på ören är det för tidigt att investera i egen drift som lösning på just denna flaskhals.

Kod ligger isolerad på `fraga-kundpilot`. Ingen produktionskod ändrades i denna omgång, ingen merge eller deploy.

## Körningar och svar

- [Sonnet första omgången](https://github.com/ludvig-vndy/kurs/actions/runs/34817303322), 75df9c1, 0,10611 USD.
- [Sonnet kortformat och strict](https://github.com/ludvig-vndy/kurs/actions/runs/34817636357), b1f6537, 0,10442 USD.
- Lokala Luna-resultat: writer-cost-1789370257489 (0,01383135 USD), writer-cost-1789370449698 (0,01000509 USD), writer-cost-1789370614259 (0,00677070 USD).
- Alla utkast, inklusive avvisade, finns i [svarsbilagan](fraga-skrivkostnad-svar-2026-09-14.md). Dessa är experimentutkast, inte publicerade kundsvar eller godkända aktieanalyser.
