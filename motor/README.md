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
