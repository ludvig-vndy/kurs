# Verktygsspec: "Säkra eller stretcha"-kalkylator

Status: endast spec. Ingen kod byggs nu. Det här dokumentet beskriver ett verktyg för Marginalens verktygssajt (`/verktyg`).

## Syfte

Göra ramen från lektion 24.4 (scenariojämförelsen: ånger vs säkrad avkastning) körbar i `/verktyg`. Användaren matar in sina egna antaganden om ett innehav som stigit förbi värdet, och verktyget lägger fram de tre handlingarna, håll allt, säkra allt och dela, sida vid sida, så att beslutet blir en vägning i stället för en känsla. Verktyget ersätter pappersräkningen i lektionens övning med en levande räknare.

## Input

Allt är användarens egna antaganden. Verktyget hämtar inga marknadsdata.

- **Dagens pris.** Aktuell kurs per aktie, utgångspunkten för alla tre utfallen.
- **Ditt värdeintervall.** Låg till hög, det beräknade värdet från modul 12 till 14. Används som ankare, inte toppen eller inköpspriset.
- **Positionens vikt.** Innehavets andel av portföljen, så att verktyget kan sätta trim-nivån i proportion.
- **Grovodds för de tre utfallen.** Upp, platå och tillbaka, i grova procenttal som summerar till 100. Verktyget ska tåla runda tal och inte kräva falsk precision.
- **En grov målkurs per utfall.** Vart kursen ungefär tar vägen i upp, platå respektive tillbaka.

## Output

- **Förväntat värde för tre handlingar.** Håll allt, säkra allt och dela (halva positionen som utgångsläge), var och en som förväntat värde per aktie, alltså målkurserna vägda med sina odds.
- **De två ångertalen sida vid sida.** Ångern vid såld uppsida (vad du gick miste om i uppscenariot om du säkrat) och ångern vid hållen kollaps (vad du tappar i fallscenariot om du hållit allt). De ställs bredvid varandra, eftersom girigheten annars bara visar det ena.
- **En föreslagen trim-nivå.** Ett förslag på hur stor del som säkras, satt i relation till hur långt priset sprungit förbi värdet och till positionens vikt.

## Avgränsning

En ren räknare på användarens egna antaganden. Verktyget hämtar inga marknadsdata, sparar inga kurser och fabricerar ingen statistik. Alla odds och målkurser kommer från användaren. Det håller verktyget inom sifferpolicyn: inga uppfunna tal för verkliga bolag, alla siffror är användarens egna eller uttryckligen illustrativa.

## Öppen fråga (för en framtida byggsession)

Ska verktyget ge en tydlig rekommendation ("trimma X procent") eller bara lägga fram talen och låta användaren döma? Argumentet för att bara lägga fram talen är att ramen i 24.4 lär ut omdöme, inte en formel, och en hård rekommendation kan bli en ny auktoritet att luta sig mot. Argumentet för en rekommendation är att den gör verktyget skarpt och handlingsbart i stunden. Användaren lutar åt en rekommendation. Beslutet tas i byggsessionen.
