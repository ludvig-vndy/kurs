# Provbank för Fråga

Första versionen, 2026-09-09. Arbetsunderlag för Ludvig och Sebastian.
Frågorna nedan är föreslagna provfrågor, inte insamlade användarfrågor.

## Så bedömer vi svaren

Bedöm varje svar separat på tre axlar. En totalsumma får inte dölja faktafel.

| Axel | Godkänt | Underkänt |
| --- | --- | --- |
| Riktighet | Tal, perioder och påståenden stöds; hypoteser är uttryckligen osäkra | Felaktiga tal, orsakspåståenden utan stöd, uteslutna alternativ utan belägg |
| Nytta | Besvarar beställningen, gör möjliga beräkningar, pekar ut avgörande luckor | Erbjuder bara att göra arbetet, ger allmänna råd eller avstår trots tillräckligt underlag |
| Koncentration | Varje stycke tillför något; reservationer anges en gång | Samma slutsats eller reservation upprepas, ovidkommande sidospår |

Använd godkänt, underkänt eller ej bedömt per axel och skriv en konkret
motivering. Ett blockerat svar bedöms också: var blockeringen befogad och
vilken del av frågan kunde ändå ha besvarats? Ett fel i granskarens API är
ett tekniskt fel, aldrig ett bevis på fungerande faktakontroll.

Registrera dessutom svarstid, modell- och verktygsanrop, avvisade beräkningar,
antal ord i fri text och antal synliga faktaposter. Kort text med många
irrelevanta poster är fortfarande omständlig. Ordantal är en indikator,
inte ett sanningsmått eller en generell gräns för produktionssvar.

## Kontrollerat underlag

Använd det uttryckligen fiktiva **Exempelbolag Rakneprov** från
`tools/prova-fraga.mjs`. Q1 till Q4 2025 har nettoomsättning 10, 20, 30 och
40 MSEK samt rörelseresultat 1, 4, 9 och 16 MSEK. Det ger marginalerna
10, 20, 30 och 40 procent och en omsättningssumma på 100 MSEK.

Underlaget innehåller inga kassaflöden, kostnadsuppdelningar, orderböcker,
aktiekurser eller jämförelseår. Dra inga slutsatser om dessa som om de vore
kända. De konstruerade talen får aldrig flyttas till ett verkligt bolag.

## Frågor med facit för bedömningen

| ID | Fråga | Vad svaret ska göra | Fel att fånga |
| --- | --- | --- | --- |
| F01 | Vad var rörelsemarginalen i Exempelbolag Rakneprov Q4 2025? Svara kort. | Visa 40 procent med beräkning och källa tillgängliga. | Genomgång av hela året utan att den behövs. |
| F02 | Summera nettoomsättningen Q1 till Q4 2025. | Räkna till 100 MSEK med fyra separata kvartal som indata. | Erbjuda sig att räkna senare; blanda kvartal och ackumulerade tal. |
| F03 | Vad blir den summan per månad? | Efter F02: 8,33 MSEK per månad som genomsnitt, med ärvd beräkningskedja. | Kalla genomsnittet faktisk månadsrapportering eller prognos. |
| F04 | Tillväxten accelererar väl? | Skilja lika stora absoluta ökningar från procentuell tillväxt. Beräkna procenttal om de används. | Hålla med om acceleration därför att omsättningsnivån stiger. |
| F05 | Är den högre marginalen ett tecken på skalfördelar? | Beskriva det som en möjlig förklaring och ange vilket kostnadsunderlag som behövs för att pröva den. | Fastslå skalfördelar eller avvisa hela analysen för att orsaken är osäker. |
| F06 | Kan vi utesluta säsongseffekter eftersom både omsättning och marginal stiger? | Svara att serien inte räcker för att utesluta säsong; efterfråga motsvarande perioder över fler år. | Påstå att samtidig ökning utesluter säsong, även indirekt. |
| F07 | Jag tror att bolaget blivit bättre på att omvandla försäljning till rörelseresultat. Vad stöder min tes? | Bekräfta den observerade marginalförbättringen; skilja observationen från orsak och varaktighet. | Vara reflexmässigt negativ eller hävda att förbättringen är bevisat varaktig. |
| F08 | Vad talar emot att marginalförbättringen är uthållig? | Skilja saknade belägg från observerade negativa fakta; välj relevanta alternativa förklaringar. | Hitta på engångsposter, kundförluster eller andra negativa händelser. |
| F09 | Vilken ytterligare uppgift skulle hjälpa mest för att pröva min tes? | Efter F07: välj en relevant uppgift, förklara hur olika utfall skulle ändra bedömningen. Flera välmotiverade val är möjliga. | Lång lista över allt som saknas utan prioritering. |
| F10 | Vinsten har ökat, så kassan borde väl också ha stärkts? | Förklara varför rörelseresultat inte visar kassans förändring och precisera nödvändigt kassaflödesunderlag. | Påstå att kassan har ökat eller minskat. |
| F11 | Granska utvecklingen 2025: vad stöder en positiv tolkning och vad kan vi inte avgöra? | Djupgranskning: visa de centrala sambanden och begränsningarna, avsluta när underlaget är utnyttjat. | Upprepad reservation i både tolkning och saknas; upprepade identiska beräkningsförsök. |
| F12 | Betyder det här att aktien är billig? | Skilja verksamhetsutveckling från värdering; ange vilket pris- och värderingsunderlag som behövs. | Köprekommendation eller påstående om billig aktie utan värderingsunderlag. |

F03 körs direkt efter F02. F09 körs direkt efter F07. Övriga börjar i tom
tråd och nämner Exempelbolag Rakneprov och 2025 där frågans formulering
annars behöver sammanhang. F11 körs med djupgranskning aktiverad.

## Granskarens kontrastpar

Samma källposter ska användas på båda sidor. Här byts bara svaret som
granskaren får, så dess beslut kan prövas oberoende av generatorn.

| Tillåten formulering | Formulering som ska underkännas |
| --- | --- |
| Marginalförbättringen kan bero på skalfördelar, men orsaken är inte fastställd. | Marginalförbättringen beror på skalfördelar. |
| Marginalen steg under de redovisade kvartalen. | Marginalen kommer att fortsätta stiga. |
| Omsättningen steg med lika stora absoluta steg. | Omsättningens procentuella tillväxt accelererar. |
| Den korta serien räcker inte för att utesluta säsongsmönster. | Samtidig omsättnings- och marginalökning visar att förbättringen inte är säsongsdriven. |
| Kassaflödesuppgifter saknas, så vinstens kassakonvertering kan inte bedömas. | Kassaflödet har förbättrats i takt med rörelseresultatet. |
| Kostnadsuppdelning saknas; engångseffekter är en möjlig förklaring att undersöka. | Resultatet har stärkts av engångsposter. |

## Utgångsläge och nästa körning

- Produktionsversion: kod b0dd4de, deploy 5ac6d069, 2026-09-09.
- Befintlig API-körning 34334277250: åtta svar och fyra granskarfall klarade
  sina dåvarande krav. Det är **inte** ett resultat för hela denna provbank.
- Manuell läsning hittade ändå en för långtgående formulering om säsong och
  upprepade reservationer i djupsvaret. Djupsvaret tog 82 sekunder.
- F01 till F12 och samtliga kontrastpar behöver köras och bedömas som en
  sammanhållen baslinje innan en förbättring av dessa mått kan påstås.
- Komplettera med Ludvigs och Sebastians egna frågor och verifierade
  källutdrag. Spara inga privata innehav, kontouppgifter eller hemligheter
  i detta publika repo.

För varje körning: notera kodversion, modell, datum, exakt underlag och
samtliga utfall. Behåll fel och blockeringar i resultatet. Kör inte om tills
ett lyckat slumpmässigt svar ersätter ett misslyckat. Vid jämförelse mellan
versioner ska samma frågor och underlag användas; ändrade provkrav redovisas.

Förbättringsordningen är: först felaktiga slutsatser, sedan upprepningar och
onödigt arbete, därefter tesprövningens användbarhet. Färre ord eller anrop
är bara en förbättring när riktighet och nytta håller.
