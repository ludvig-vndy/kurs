# Motorn v0: extraktion, beräkning, narration, verifiering

*2026-07-06. Fas 1-spiken ur final boss-dokumentet (§2, §5). Bevisar pipelinens form och, viktigast, att noll-hallucinationskravet är körbar kod i stället för ett löfte.*

## Kör

```
node motor/run.mjs                 # hela pipelinen på Norlux-fixturen (fiktiv), ska ge PASS
node motor/run.mjs --lifco         # v0.1: Lifco-fallkällan, verklig användarverifierad data, ska ge PASS
node motor/run.mjs --kallelse      # v0.2: utspädningsvakten, fiktiv Voltcell-stämmokallelse, ska ge PASS
node motor/run.mjs --avtal         # v0.3: avtalsklassificeraren, fiktiva Voltcell-PM, ska ge PASS
node motor/run.mjs --sabotage      # injicerar en påhittad siffra, ska ge FAIL (kombinerbar med alla)
```

## v0.1: verklig data (Lifco, 2026-07-07)

`--lifco` kör pipelinen på `docs/case-sources/fall-lifco-2025.md`: verkliga, användarverifierade tal i prosaformat (tal inbakade i löpande punktlistor, inte i en nyckeltalstabell). Egen adapter (`extract-lifco.mjs`, `compute-lifco.mjs`, `narrate-lifco.mjs`), facit `fixtures/lifco-fy2025-facit.json` med 30 värden. Narrationen följer fallkällans regler: daterad ram, härledda tal anges som uträkningar, aldrig råd.

Två saker som v0.1 bevisade:

1. **Korskontrollen:** källan innehåller rapportens egna procentsatser ("upp 8,1 procent") bredvid nivåerna. Motorn räknar om procenten ur nivåerna och kräver att de stämmer inom 0,1 procentenheter. Lifco: 3 av 3 stämmer. Det är samma mekanism som i produktion ska fånga felextraktioner och rapporter vars egen matematik inte går ihop.
2. **Grinden hade ett hål, och sabotaget hittade det.** Verifieraren tillät avrundningsmatchning (token "23" matchade verkliga 22,6). Med fler verkliga fakta ökar risken för nära-värden, så matchningen är nu exakt likhet: vill narrationen avrunda ett tal ska avrundningen ske i compute-steget och bli ett eget tillåtet värde. Avrundning är en beräkning, inte en frihet för texten.

## Arkitekturen (samma som produktens)

1. **`extract.mjs`** läser rapporten och producerar fakta med källcitat och sidnummer. V0 är en deterministisk parser för sammandrags-sektionen; i produktion är steget LLM-assisterat men med exakt samma utdata-schema, så allt nedströms är oförändrat.
2. **`compute.mjs`**: all matematik (YoY, marginaldeltan, utspädning, guidningsjämförelse) sker här, i kod. Modellen räknar aldrig.
3. **`narrate.mjs`**: klarspråkstext enligt husets språkregler. V0 är mallar; i produktion polerar en LLM, men den får bara tal ur fakta/beräkningar.
4. **`verify.mjs`**: grinden. Plockar varje tal ur den färdiga texten (svenska format: tusentalsmellanslag, decimalkomma, procent) och kräver att det matchar ett extraherat faktum eller en beräkning. Ett omatchat tal är ett blockerande fel, texten visas inte. Grinden är oberoende av vem som skrev texten, det är det som gör LLM-steget säkert att koppla in.

## v0.2: utspädningsvakten (2026-07-07)

`--kallelse` läser en fiktiv kallelse till Voltcells årsstämma och plockar ut allt som kan späda ut ägarens andel: bemyndigandet (antal aktier och kallelsens egen cirka-procent), konvertibellånet (nominellt, konverteringskurs, förfall) och optionsprogrammet. Andelar och maxutspädning räknas i kod; korskontrollen jämför kallelsens egna uppgifter mot vad nivåerna ger (cirka 20 procent mot beräknade 20,0; uppgivna konvertibelaktier mot nominellt delat med kurs). Narrationen förklarar i klarspråk vad ett bemyndigande är, vad "utan företrädesrätt" betyder, och var taket ligger: som mest 30,5 procent fler aktier om allt blir verklighet. Detta är funktionen Sebastian pekat ut som betalningsdrivaren, nu körbar.

## v0.3: avtalsklassificeraren (2026-07-07)

`--avtal` läser tre fiktiva Voltcell-pressmeddelanden och avgör vad varje avtal faktiskt binder: avsiktsförklaring, ramavtal eller bindande order. Klassificeringen är regelbaserad i v0 (i produktion LLM bakom samma schema och samma facit-eval) och varje klassning bär sitt bevis, den mening ur avtalstexten som avgör. Beräkningarna sätter proportionerna: ramavtalets marknadsförda 300 miljoner är 71 gånger den enda bindande ordern, och avsiktsförklaringen hade efter 7 månader inte följts av något avtal. Klasserna evalueras mot facit och valideras mot ett slutet klasschema; talen går genom samma grind som allt annat. Detta är kärnan i det kvalitativa lagret (casetrappan/avtalsliggaren) ur final boss.

## Eval

`fixtures/norlux-facit.json` är facit för fixturen; `run.mjs` jämför extraktionen mot det fältvis. Nya fixturer läggs till med samma mönster: rapporttext + facit. Nästa fixtur: Lifco-caset (`docs/case-sources/fall-lifco-2025.md`, användarverifierad verklig data).

## Status v0, medvetna avgränsningar

- Fixturen är en fiktiv men realistiskt formaterad rapport (Norlux, samma siffror som mockarna). Riktiga rapporter är stökigare: nästa steg är PDF → text (pdftotext eller LLM-läsning) och LLM-extraktion bakom samma schema, med facit-eval per bolag.
- Formatbevaring är kosmetiskt ofärdig: "11,0" i rapporten skrivs "11" i narrationen (numeriskt korrekt, verifieraren matchar). Fixas när narrationssteget blir LLM.
- Trender över 6 kvartal kräver historikdatabas (fas 2); v0 räknar mot jämförelsekvartalet i rapporten.

## Kopplingen till planen

Detta är "extraktionsmotorn med noll-hallucinationskrav" ur final boss §5 fas 1 och value proposition-dokumentets "byggs härnäst". Rapportanalysen, Fråga bolaget, löftesliggaren och utspädningsvakten är alla samma motor med olika dokument in.

## Ljudutgåvan v0 (2026-07-07)

`node motor/ljud.mjs` gör Ägarbrevet hörbart: narrationen går genom noll-hallucinationsgrinden (ogranskad text läses aldrig upp), sedan genom uttalsnormaliseraren (`tts-normalize.mjs`: tal blir ord, "1,15 kronor" blir "en krona och femton öre", procenttecken blir ordet procent, kvoter och parenteser blir talspråk; egen facit-svit i `test-normalize.mjs`), och syntetiseras till `motor/out/agarbrevet-norlux.wav` med Windows inbyggda svenska röst (Microsoft Bengt, WinRT). Bengt är en demo-röst; i produktion byts syntessteget mot neural TTS med exakt samma manus, det är därför normaliseringen ligger i vår kod och inte hos rösten. Manuset landar på cirka 90 sekunder, brevets format.

## LLM-lagret (skrivet 2026-07-07, väntar på nycklar)

Hela logiken är färdig; nycklarna är två miljövariabler (`OPENAI_API_KEY`, `ANTHROPIC_API_KEY`):

- **`llm.mjs`**: leverantörsagnostisk klient via fetch, inga nya beroenden. Pristabell för kostnadsräkning per anrop (ögonblicksbild, uppdatera mot aktuella prislistor).
- **`extract-llm.mjs`**: extraktion bakom samma schema som de deterministiska adaptrarna. Fältlistan definierar vad som hämtas, modellen får aldrig välja egna fält, citat är obligatoriskt och "vet ej" uttrycks genom frånvaro. Även avtalsklassning med bevismening.
- **`narrate-llm.mjs`**: modellen skriver, verify.mjs granskar innan texten får användas. Stilreglerna (klarspråk, inga råd, inga tankstreck) ligger i systemprompten.
- **`klassificera-fraga.mjs`**: scope-vakten för Fråga AI, billig klassificering (portfolj/bolag/kurs/utanfor) före det dyra steget, med standardavböjningen som konstant.
- **`eval-llm.mjs`**: selen som väljer modell. Kör fixturerna mot facit per modell och räknar rättprocent, kostnad och tid. `--torr` kör utan nycklar med de deterministiska extraktorerna som låtsas-LLM och bevisar hela jämförelselogiken: 37/37.

Nyckeldagen: `$env:OPENAI_API_KEY="sk-..."` och sedan `node motor/eval-llm.mjs --modell gpt-5.4-mini --modell claude-haiku`. Tabellen som kommer ut väljer modell per steg.

### Modellvalet: fyra modeller mot samma facit (2026-07-07)

| Modell | Norlux | Lifco | Kallelse | Avtal | Hela evalen | Narration genom grinden |
|---|---|---|---|---|---|---|
| gpt-5.4-mini | 8/8 | 18/18 (1 citat-miss) | 8/8 | 3/3 | /usr/bin/bash,015 | PASS 21/21, /usr/bin/bash,002 |
| claude-haiku | 8/8 | 18/18 | 8/8 | 3/3 | /usr/bin/bash,024 | PASS 21/21, /usr/bin/bash,003 |
| claude-sonnet | 8/8 | 18/18 | 8/8 | 3/3 | /usr/bin/bash,063 | ej testad |
| gpt-5.5 | 8/8 | 18/18 | 8/8 | 3/3 | /usr/bin/bash,117 | ej testad |

Alla fyra modeller extraherar felfritt på alla fyra dokumenttyperna. Skillnaderna: gpt-5.4-mini är billigast och snabbast men tappade ett källcitat på Lifco (värdet rätt, citatet saknades; i produktion blockerande). claude-haiku levererade samtliga citat. Toppmodellerna ger ingen mätbar kvalitetsvinst för extraktion, bara 3 till 8 gånger högre pris. Arbetshypotes tills fler dokument testats: claude-haiku för extraktion (citatdisciplinen), gpt-5.4-mini eller haiku för narration, nano-klass för klassificering. Två tidiga fynd på vägen: Haikus enda första-miss var en tvetydig fältbeskrivning (teckenkonvention, skärpt), och OpenAI:s nya modeller kräver max_completion_tokens i stället för max_tokens.

## Alpha: riktiga dokument (2026-07-07)

`hamta.mjs` (URL till ren text, motor/in/ är gitignorerad) och `kor-dokument.mjs` (riktigt dokument genom LLM-extraktionen med generisk fältlista per typ: rapport, kallelse, emission, avtal; utan facit är utdata fakta med citat för mänsklig granskning). Första skarpa körningen: fyra färska Unibap-dokument från MFN. Emissions-PM:et och extra-stämmokallelsen extraherades felfritt med citat (och korsbekräftar varandra: samma aktieantal, kurs och belopp i två oberoende dokument). Q1-rapportens PM gav 4 av 7 fält, resten står bara i PDF:en (nästa byggsteg). Första verkliga klassificerarfyndet: ett engelskt samarbets-PM utan ordervärde klassades som bindande order på frasen "signed an agreement"; klassningsprompten behöver skärpas med beloppskrav och engelska mönster. Kostnad: cirka 1 cent per dokument.

## Nattjobbet (2026-07-07)

`node motor/natt.mjs` är alphans dagliga körning: läser bevakningslistan (`bolag.json`), upptäcker nya pressmeddelanden i varje bolags MFN-flöde (arkivet i motor/in/arkiv.json minns sedda länkar), hämtar, typbestämmer (`faltlistor.mjs`), extraherar/klassificerar med citatkrav, sparar data per bolag (motor/out/data/) och renderar bolagssidor (motor/out/bolag-<id>.html) med korskontroller räknade i kod (t.ex. PM:ets utspädningssiffra mot aktieantalen). Varje körning tar upp till maxNya osedda länkar, så de första körningarna betar av historiken bakåt tills arkivet är ikapp; därefter hämtas bara färska PM. Två första körningarna: 16 Unibap-dokument för totalt $0,09.

Schemaläggning på Windows: sätt först nyckeln som användarvariabel (kör själv: `setx ANTHROPIC_API_KEY "sk-ant-..."`), sedan:
```
schtasks /create /tn "AgarkollenNatt" /sc daily /st 06:30 /tr "cmd /c cd /d C:\dev\kurs && node motor\natt.mjs >> motor\out\natt.log 2>&1"
```
Nya bolag: lägg till en rad i bolag.json med id, namn och MFN-flödets URL. Kvar till beta: mejlutskicket av brevet, PDF-till-text för fullständiga rapporter, och per-bolags-facit för kontinuerlig eval.

## PDF-läsningen (2026-07-08)

Claude läser PDF:er direkt via dokumentblock i API-anropet, ingen pdftotext och inga nya beroenden. `hamta.mjs` sparar PDF:er binärt och plockar dessutom ut PDF-bilagelänkar (storage.mfn.se) ur pressmeddelanden; nattjobbet läser automatiskt rapport-PDF:en i stället för PM-sammanfattningen när en bilaga finns. Skarpt bevis: Lifcos riktiga bokslutsrapport 2025 (engelsk PDF, 674 kB) genom extraktionen gav 13 av 13 fält rätt mot den användarverifierade fallkällan, med ordagranna citat, för $0,057. `kor-dokument.mjs --facit <fil>` rättar automatiskt mot facit.

## Sex bolag i drift (2026-07-08)

Bevakningslistan täcker nu sex arketyper: Unibap (förhoppningsbolag), Lifco (förvärvare, egen artikel-URL-form på MFN vilket generaliserade länkmönstret), Evolution (högt flöde), Telia (kassako), Sectra (nischbolag med kundavtal), Axfood (defensivt). Verklighetsfynd från första helkörningen, båda åtgärdade: typbestämningen var för generös (återköp, personnyheter och inbjudningar nådde avtalsklassificeraren; brus-mönster prövas nu före rapport, och förvärv fick egen typ) och varje bolag publicerar språkdubbletter (SV+EN), vilket är fas 2-dedupens existensberättigande i förväg. Klassificeraren själv dömde rätt på riktiga avtal: Sectras kundavtal blev bindande order, Telias partnerskap avsiktsförklaring.

## Mejlutskicket, alphans sista pusselbit (2026-07-08)

`render-brev.mjs` renderar dagsbrevet ur nattens faktiska fynd (nya dokument per bolag, lugna bolag redovisas uttryckligen) som mejlvänlig HTML, och `skicka.mjs` postar det via Resend (ren fetch, RESEND_API_KEY i miljön). natt.mjs sparar alltid brevet till motor/out/brev-<datum>.html och mejlar när nyckeln finns. Utan verifierad domän skickar Resend från onboarding@resend.dev och bara till kontoägarens adress, vilket räcker för alphan; för utskick till fler verifieras en egen domän i Resend-konsolen (två DNS-poster). Mottagare och avsändare konfigureras i bolag.json under "utskick".

Alphans hela loop är därmed komplett: MFN-flöden → nya dokument upptäcks → HTML eller rapport-PDF läses → extraktion med citatkrav → korskontroller i kod → bolagssidor + dagsbrev → mejl. Det som återstår är nycklar i miljön (setx: ANTHROPIC_API_KEY, RESEND_API_KEY) och schtasks-raden ovan.

## Nattens fas 2-paket (2026-07-08)

- **Rapportkollen** (`rapportkollen.mjs`): fas 1-ytan som verktyg. URL eller fil in, grindad analys ut som HTML: extraktion med citat, förändringar i kod, LLM-narration, grinden före visning. Blockeras narrationen visas fälten ändå.
- **Språkdubbletts-dedup** i nattjobbet: talmängdsjämförelse inom samma körning, bara för avtal/förvärv/övrigt (en rapport delar siffror med kvartalets PM utan att vara dubblett), tröskel 0,6. Dubbletter kostar ingen LLM och visas kompakt.
- **LLM-typbestämning** av fallback-dokument (`bestamTypLLM`): slug-reglernas "avtal"-fall typbestäms av billigaste modellen innan dyra steg.
- **FI:s insynsregister** (`hamta-insyn.mjs`): öppen data, CSV per utgivare (UTF-16), summeras per bolag (12 mån, netto, senaste transaktioner) in i bolagssidan; nya poster efter baslinjen flaggas i dagsbrevet. Ingen LLM, registret är strukturerat.
- **Fråga AI v0** (`fraga.mjs`): frågor mot dokumentarkivet med produktkedjan i miniatyr: scope-vakt, hämtning, svar enbart ur utdragen, och KÄLLGRINDEN: varje tal i svaret måste finnas i utdragen modellen fick. Bevisat skarpt: modellen försökte själv räkna fram tranche-storlekar (72 292 013 minus 62 304 860), grinden blockerade; efter skärpt instruktion svarar den ur källan och passerar.
- **NBSP-fixen**: MFN-texter använder hårda mellanslag i tal; normaliseras nu i både hamta och hittaTal. Utan den missar talmatchning tyst, viktigaste buggfixen i natt.
- **Täckningslistan**: bolagssidan redovisar vilka källor som bevakas, löftet "du missar inget" i verifierbar form.

## Fas 3 i förtid: blankning och omvärld (2026-07-08)

- **Blankningsregistret** (`hamta-blankning.mjs`): FI:s aggregat per emittent (ODS, packas upp med PowerShell, ingen ny dependency). Nivån visas på bolagssidan, och diffen mot förra körningen är "veckans avvikelser" i sin första form: förändring över 0,15 procentenheter flaggas i dagsbrevet ("blankningen byggs upp: 2,3% till 2,6%"). Skarp data: Evolution 5,92%, Lifco 3,29%, Telia 2,34%.
- **Omvärldsbevakningen v0**: konkurrentflöden per bolag i bolag.json (Tele2 för Telia, AAC Clyde Space för Unibap, Betsson för Evolution). Bara rubriker, ingen LLM-kostnad; rapporter, emissioner, förvärv och vinstvarningar hos konkurrenten flaggas i dagsbrevet som "Omvärld". Bransch- och konkurrentkartor i full skala är fortfarande fas 3; detta är den konfigdrivna föregångaren.
