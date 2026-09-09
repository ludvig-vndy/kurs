# Relationer, premisser och kortning

Implementerat på testgrenen `fraga-berakning-prov`, grundändring `33f900d`,
eftergranskade rättningar `e801ae3`. Ingen produktionsdeploy.

## Vad som ändrats

- `berakna(utveckling)` jämför positiva värden för samma bolag, mått, slag,
  enhet och angränsande perioder av samma längd. Servern skriver vilka par
  som fördubblats/halverats och om positiv procentuell tillväxt ökar i varje
  jämförelse. Decimalprodukter jämförs exakt utifrån de kanoniska värdenas
  decimalrepresentation; beslut bygger inte på avrundade procentsatser.
- Kända relationsord stoppas i fri prosa och hänvisas till beräkningsverktyget.
  Kontrolltecken som förstör text eller gömmer ord stoppas också.
- Generator och granskare skiljer uttryckliga premisser från tillagda
  antaganden. Kontrollparen omfattar utdelning, nyinvesteringar, historisk
  kontra ny avkastning, frånvaro av underlag och redovisningssamband.
- Ett budgeterat kortningsförsök får föreslå kortare prosa. Faktapostblock
  och stödreferenser bevaras mekaniskt. Original och vald sluttext går till
  slutgranskning, även när redigeringen tog bort all prosa. Ogiltig kortning
  lämnar originalet för granskning. Ett semantiskt avslag publicerar inget.

## Skarpt prov av grundändringen

[Körning 34361362961](https://github.com/ludvig-vndy/kurs/actions/runs/34361362961)
körde fyra frågor och sexton kontrollfall med riktiga modellanrop.

- Alla fyra frågor fick svar. Kortaren ändrade två svar från 204 till 146
  respektive 305 till 183 ord. Ett förslag avvisades; originalets 262 ord
  behölls. Kortning är alltså inte ett garanterat ordtak.
- Serien 10/20/30/40 fick korrekt serverutsaga: bara första paret
  fördubblades, och procentuell tillväxt accelererade inte genom serien.
- Femton kontrollfall fick väntat utfall. Accelerationsfallet avslöjade ett
  fel i provets generatorstub: den kunde inte läsa registret när instruktionen
  för rättningsvarvet lagts efter JSON. Stubben är rättad i `e801ae3`.
- Manuell läsning hittade sakfel trots godkänd modellgranskning: en
  nedskrivning beskrevs som marginalhöjande, senare leverantörsbetalningar
  blandades ihop med marginal och hög utdelning tolkades som avsaknad av
  nyinvesteringar. Ett svar innehöll också trasiga kontrolltecken.
  Riktade regler och ytterligare sex positiva/negativa kontrollfall har lagts
  till. Effekten av dessa sista promptändringar är ännu inte skarpt verifierad.

## Kodgranskning och lokala kontroller

Den oberoende granskningen hittade två fel, båda rättade med regressioner:
konstant tillväxt i decimalserien 0.01/0.0107/0.011449 gav falsk acceleration
på grund av flyttalsbrus; en kortning till enbart faktaposter kunde hoppa över
slutgranskningen. Båda vägarna är nu testade.

De tretton nya regressionstesterna passerar. `npm run check` passerar och
Astro-bygget passerade efter grundändringen. Senaste hela lokala körningen:
563 tester, 560 passerar, tre databasetester får nätverksfelet EACCES i
sandkassan. Den tidigare körningen med databasåtkomst hade två redan kända
fel om schemat för `prospekt_arbete`; dessa ändringar rättar inte schemat.

## Kvar och nästa steg

Automatisk godkännandegranskning avvisade push av `e801ae3` till det offentliga
repoet och begär uttrycklig användartillåtelse för publicering av kodpaketet.
Origin och administratörsbehörighet har verifierats. Ingen annan överföringsväg
har använts. Nästa steg efter tillåtelsen är push till befintlig testgren och
ett nytt skarpt prov av samma fyra frågor samt samtliga tjugotvå kontrollfall.
Läs själva svaren, inte bara jobbets gröna status.

Relationsgrinden är en avgränsad ordkontroll, inte bevis för all naturlig
språksemantik. Synonymer kan falla utanför och generella förklaringar eller
negationer med de kända orden kan stoppas för hårt. Beräkningen stödjer inte
negativa/nollbaser eller periodserier med luckor. Semantisk granskning kan
fortfarande missa fel; utfallet ovan visar varför ingen felfrihetsgaranti ges.
