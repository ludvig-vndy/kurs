# Motorn v0: extraktion, beräkning, narration, verifiering

*2026-07-06. Fas 1-spiken ur final boss-dokumentet (§2, §5). Bevisar pipelinens form och, viktigast, att noll-hallucinationskravet är körbar kod i stället för ett löfte.*

## Kör

```
node motor/run.mjs                 # hela pipelinen på Norlux-fixturen, ska ge PASS
node motor/run.mjs --sabotage      # injicerar en påhittad siffra, ska ge FAIL
```

## Arkitekturen (samma som produktens)

1. **`extract.mjs`** läser rapporten och producerar fakta med källcitat och sidnummer. V0 är en deterministisk parser för sammandrags-sektionen; i produktion är steget LLM-assisterat men med exakt samma utdata-schema, så allt nedströms är oförändrat.
2. **`compute.mjs`**: all matematik (YoY, marginaldeltan, utspädning, guidningsjämförelse) sker här, i kod. Modellen räknar aldrig.
3. **`narrate.mjs`**: klarspråkstext enligt husets språkregler. V0 är mallar; i produktion polerar en LLM, men den får bara tal ur fakta/beräkningar.
4. **`verify.mjs`**: grinden. Plockar varje tal ur den färdiga texten (svenska format: tusentalsmellanslag, decimalkomma, procent) och kräver att det matchar ett extraherat faktum eller en beräkning. Ett omatchat tal är ett blockerande fel, texten visas inte. Grinden är oberoende av vem som skrev texten, det är det som gör LLM-steget säkert att koppla in.

## Eval

`fixtures/norlux-facit.json` är facit för fixturen; `run.mjs` jämför extraktionen mot det fältvis. Nya fixturer läggs till med samma mönster: rapporttext + facit. Nästa fixtur: Lifco-caset (`docs/case-sources/fall-lifco-2025.md`, användarverifierad verklig data).

## Status v0, medvetna avgränsningar

- Fixturen är en fiktiv men realistiskt formaterad rapport (Norlux, samma siffror som mockarna). Riktiga rapporter är stökigare: nästa steg är PDF → text (pdftotext eller LLM-läsning) och LLM-extraktion bakom samma schema, med facit-eval per bolag.
- Formatbevaring är kosmetiskt ofärdig: "11,0" i rapporten skrivs "11" i narrationen (numeriskt korrekt, verifieraren matchar). Fixas när narrationssteget blir LLM.
- Trender över 6 kvartal kräver historikdatabas (fas 2); v0 räknar mot jämförelsekvartalet i rapporten.

## Kopplingen till planen

Detta är "extraktionsmotorn med noll-hallucinationskrav" ur final boss §5 fas 1 och value proposition-dokumentets "byggs härnäst". Rapportanalysen, Fråga bolaget, löftesliggaren och utspädningsvakten är alla samma motor med olika dokument in.
