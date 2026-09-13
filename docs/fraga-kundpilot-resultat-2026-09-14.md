# Kundpilot: fullständiga prov och kvarvarande fel

Piloten kan själv hitta och läsa externa original genom samma svarsflöde som den befintliga chatten. Proven visar ännu inte tillräcklig svarskvalitet, stabil svarstid eller hållbar styckkostnad för utrullning.

## Jämförelsen

Baslinje och pilot använder verkliga Anthropic-anrop, samma djupa läge och samma publika arkivkopia. Supabase-inloggningen är en lokal providentitet och bolagen en publik testbevakningslista. Kundflödet körs genom HTTP, ordinarie postregister, granskning och rendering. Piloten använder dessutom OpenAI för sökkandidater och hämtar originalen själv. Inga externa startadresser eller manuellt utvalda svarsposter skickas till modellen.

Arkivets SHA-256 är identiskt i de första tre körningarna: `554cc49bca91011b599b6f949ccf2740931c80af89807eca3aa310cdd37066b3`. Externa sökresultat och modellutfall är däremot inte frysta. Detta är utvecklingsprov på kända frågor, inte ett undanhållet generaliseringstest eller en jämförelse mot ChatGPT.

| Fråga/version | Sekunder | Kr, uppskattat | Manuell bedömning |
| --- | ---: | ---: | --- |
| Bifrost, baslinje 1 | 32,4 | 3,08 | Kommentaren borttagen; endast källmaterial, ingen färdig analys |
| Bifrost, baslinje 2 | 40,7 | 4,13 | Saknar extern koppling; överdriver ett generellt mönster från pilot till större affär |
| Bifrost, första pilot 1 | 42,7 | 3,67 | Hittar Space Inventor men uppgraderar satellit/ESM-verifiering till bevisad AI-funktion |
| Bifrost, första pilot 2 | 73,3 | 4,73 | Bevarar den öppna följdorderfrågan, men otydlig om datum och framtida finansiering |
| Bifrost, omprov 1 | 43,0 | 2,54 | Blockerat, inga externa original lästa |
| Bifrost, omprov 2 | 85,5 | 4,84 | Inga externa original lästa; återgår till Unibaps material |
| Sivers/POET, baslinje | 48,4 | 2,06 | Blockerat för obelagda påståenden |
| Sivers/POET, pilot | 28,0 | 1,69 | Läser POET och Sivers men tappar viktig jämförelse och uttrycker status för säkert |

Kr använder bokföringsantagandet 10 SEK/USD. Usage inkluderar generator, reparation, eventuell redigering, granskare och sökning. Priser kontrollerade mot [Anthropic](https://platform.claude.com/docs/en/about-claude/pricing) och [OpenAI](https://developers.openai.com/api/docs/pricing); detta är uppskattningar, inte fakturakvitton. Cacheutfall ingår. Hela svarskostnaden får inte förväxlas med sökningens mindre tillägg.

## Vad som ändrades, varför och vad som faktiskt verifierats

1. **Kopplade extern sökning/läsning till befintlig chatt.** Båda första Bifrost-piloterna hittade Space Inventors original. Sivers-piloten hittade och läste POETs egna sidor. Detta löser tillgång till fler källor i dessa försök, men bevisar inte korrekt analys.
2. **Rättade källhantering före betalproven.** Hela meningsfönster ersätter fasta klipp som kunde dela tal. Externa sidor är neutrala dokumentcitat, inte automatiskt motpartens egen kommunikation. Regressionstester bevarar decimaler och hindrar godtycklig lässtart mitt i tal.
3. **Minskade dubblerad text utan att radera underlag.** I första batchen fanns samtliga 63 råa arkivutdrag redan ordagrant i registret när de returnerades. De duplicerade 44 203 källtecken en gång och 154 833 tecken över efterföljande modellanrop. Piloten ersätter nu exakt entydiga dubbletter med post-id. Hela poster och källor bevaras. Identisk text från olika källor lämnas orörd. Dessa är verifierade teckenmängder, inte uppmätta besparingar i tokens eller tid.
4. **Skärpte projekttolkning i generator och granskare.** Plattformens driftsättning bevisar inte varje AI-funktion; nuvarande finansiering får inte flyttas till framtida uppdrag; äldre status är inte automatiskt nuläge. Detta är en experimentell instruktion, ingen verifierad garanti. Omprovet gav sämre helhetsresultat och räknas inte som framgång.
5. **Rättade ett konkret sökbortfall.** Alla fyra OpenAI-sökningar i Bifrost-omprovet hade färdiga sökträffar men avklippt avslutande sammanfattning. Koden avvisade därför användbara kandidatlistor. Sammanfattningen används inte som faktaunderlag. Efter rättning återger offline-replay tolv kandidater per sökning, utan en enda faktapost från sökutdrag. Pågående/slutligt svaromprov dokumenteras nedan.

## Slutprovet

Efter r?ttningen av s?kbortfallet l?ste b?da Bifrost-f?rs?ken tre externa sidor. Det f?rsta anv?nde FMV och Space Inventor och h?ll uttryckligen is?r ett belagt samarbete fr?n en obekr?ftad f?ljdaff?r. Det ?r anv?ndbart, men svaret inneh?ller l?nga dokumentcitat, sidnavigation och orelaterade orderbelopp. Det hittade uppskjutningsmaterial, inte en senare verifierad projektstatus. Det andra f?rs?ket gav inget kundsvar efter ett prosaformatfel och reparationsf?rs?k. Att felet om redan bevisad AI inte ?terkom bevisar inte prompt?ndringens effekt: commissioning-k?llan l?stes inte i dessa f?rs?k.

Tio fullst?ndiga fr?gek?rningar kostade sammanlagt uppskattat 3,49059191 USD, cirka 34,91 kr. Inklusive de tv? tidigare API-kopplingsproven: 3,53641477 USD, cirka 35,36 kr. Inga fler betalprov k?rdes efter slutprovet. De sju pilotk?rningarna l?g p? 1,69?4,84 kr och 28,0?85,5 sekunder, inklusive misslyckade svar. I slutprovet kostade sj?lva s?kningen cirka 13 ?re per fr?ga; huvuddelen l?g i den befintliga modellkedjan.

## Sakgranskning

Space Inventors lästa commissioning-besked verifierar satellit och ESM-last. Det säger därefter att nästa fas ska demonstrera bland annat AI-baserad måldetektering. Första pilotsvarets formulering att Unibaps AI har bevisat sig fungera i omloppsbana är därför för stark. Den ordinarie granskaren godkände ändå svaret trots tillgång till källan. Det är ett genomsläppt sakfel, inte bara en stilfråga.

I Sivers-fallet fanns POETs ursprungliga gemensamma mål för prototyper och produktionsberedskap i en registrerad post. Sluttexten använde ändå bara Sivers senare aktieägarbrev och förklarade inte skillnaden mellan det gemensamma projektets mål och Sivers bredare laserkvalificering. Äldre provleveranser bevisar heller inte att kommersiella leveranser fortfarande saknas. Svaret saknade dessutom den efterfrågade analysen av vad som stärker eller försvagar fler affärer.

## Konkreta nästa steg utifrån mätningen

Nästa större ändring bör skilja undersökningens insamlade uppgifter från det korta underlag som används för att skriva slutsvaret. Ett versionsbundet undersökningsunderlag behöver uttryckligen hålla ihop projekt, komponentroll, daterad plan, observerat utfall och kvarvarande verifieringsfråga. Det ska även bära relevanta motuppgifter som annars riskerar att tappas vid slutskrivningen.

Hypotesen att prova är att detta ger bättre jämförelser och mindre irrelevant återberättande än att låta modellen fortsätta skriva ur hela det växande arkivet. Behåll exakt dessa fall som regressioner: AI-demonstration är inte samma sak som satellitdriftsättning; ett generellt kvalificeringsmål är inte automatiskt en reviderad projekttidplan; frågan om båda parter ska inte sluta som en ensidig sammanfattning. Den hypotesen är ännu inte bevisad och bör prövas på sparade källor innan ny bred sökning betalas.

Följdfrågor fungerar tekniskt med signerat minne men har inte körts skarpt i denna jämförelse. Full dokumentcache mellan turer, ytterligare bolag och produktionspilot återstår. Ingen merge eller deploy är gjord.

## Underlag

- [Första jämförelsen](https://github.com/ludvig-vndy/kurs/actions/runs/34787556552), 4eb0dbc, 1,56042372 USD.
- [Bifrost-omprov](https://github.com/ludvig-vndy/kurs/actions/runs/34788086139), a46cf53, 0,73873456 USD.
- [Sivers/POET](https://github.com/ludvig-vndy/kurs/actions/runs/34788142109), a46cf53, 0,37547120 USD.
- [Slutprov Bifrost](https://github.com/ludvig-vndy/kurs/actions/runs/34788341783), 3906e97, 0,81596243 USD.
- Faktiska levererade texter med källänkar finns i `fraga-kundpilot-svar-2026-09-14.md`. Alla texter där är provutfall, inte godkända analyser.
