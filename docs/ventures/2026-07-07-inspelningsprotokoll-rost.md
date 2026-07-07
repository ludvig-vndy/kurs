# Inspelningsprotokoll: Sebastians röst (kursen + klonträning)

*2026-07-07. Underlag inför röstinspelningen. Inspelningen har dubbel användning: äkta uppläsning i Fokus-spelaren, och träningskorpus för röstklonen som läser morgonbreven (som genereras varje natt och aldrig kan förinspelas). Manusen genereras ur lektions-JSON med `node motor/fokus-ljud.mjs --alla` och ligger i `motor/out/manus/`.*

## Omfattning och etappindelning

Hela kursen är 57 lektioner, cirka 63 000 ord, 8 timmar rent tal, 16 till 24 timmars studiotid med omtag. Därför två etapper:

1. **Etapp 1, en studiodag (~2 till 3 timmar tal):** kapitel 17 (fem lektioner, säljmodulen), kapitel 1 (gratiskapitlet, det flest hör), och alla kapitelintron/"Sebastian tänker". Det räcker med god marginal som träningsdata för en förstklassig klon (kloner av professionell kvalitet behöver 30 minuter till 3 timmar rent tal).
2. **Etapp 2, löpande:** resterande kapitel spelas in i egen takt och ersätter klonens versioner kapitel för kapitel. Klonen fyller luckorna under tiden, så ingenting blockerar lansering av ljud i spelaren.

## Kvalitetsregler (styr klonens kvalitet direkt)

- **Samma förutsättningar varje session:** samma mikrofon, samma rum, samma avstånd (cirka 15 till 20 cm), samma tid på dygnet om möjligt. Konsistens väger tyngre än perfektion.
- **Rummet:** litet, möblerat, utan hårda parallella ytor. Garderob slår vardagsrum. Ingen fläkt, inget kylskåp i bakgrunden.
- **Tonläge: poddröst, inte föreläsningssal.** Nära, lugn, samtalston, samma röst som morgonbrevet ska ha. Klonen ärver tonläget i träningsdatat.
- **Format:** wav eller flac, 48 kHz, 24 bit, mono. Ingen brusreducering eller EQ före leverans, råfiler är bäst för träning.
- **Läs från de genererade manusen** ordagrant. Manusen är uttalsnormaliserade (siffror utskrivna som ord) och identiska med spelartexten, och paret manus + ljud är exakt det format klonträning vill ha.
- **Omtag:** vid felläsning, ta om hela meningen efter en tyst paus på ett par sekunder (lätt att klippa). Markera inte muntligt.
- **Namngivning:** en fil per lektion, samma namn som manuset: `17.1-casetrappan.wav`.

## Rättigheter (in i beslut 3, roller och ägande)

Skriftligt godkännande för kloning, tydlig märkning i produkten att genererade uppläsningar är AI-röst byggd på Sebastians inspelningar, och avtalsreglering av vem som äger och får använda klonen om samarbetet ändras.

## Leverans och nästa steg

Filerna levereras till en delad katalog. Därefter: klonen tränas (ElevenLabs professional eller Azure custom voice), morgonbrevets manus (`motor/ljud.mjs`) och lektionsmanusen syntetiseras med klonen i stället för Windows-rösten, samma pipeline, bara röstbyte.
