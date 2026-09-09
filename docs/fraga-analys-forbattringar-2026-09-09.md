# Förbättringar efter avancerade chattprov

## Vad ändras och varför?

| Observerat problem | Ändring | Förväntad effekt | Verifiering |
| --- | --- | --- | --- |
| ROIC-jämförelser utan rapportperiod hamnade på Haiku | Routning tar hänsyn till jämförelse, resonemang, tesprövning och struktur kontra säsong | Starkare analys även utan identifierade bolag | Regressionstest av modellval och faktiskt endpoint-anrop |
| Modellen skrev `stöd` i stället för `stod`, även efter reparation | Strikt verktygsschema med separata tillåtna blockformer | Färre avslag på grund av fel fältnamn eller extra fält | Skarp API-körning och befintliga negativa servertester |
| Operativt kassaflöde blandades ihop med investeringskassaflöde | Skribent och granskare får precisa regler om begrepp och förutsättningar | Stoppa sammanblandning utan att stoppa korrekta jämförelser | Positiva och negativa kontrollpar |
| Sjunkande avkastning likställdes med värdeförstöring | Skilj rörelseriktning från nivå relativt kapitalkostnad, även vid gränsen | Bevara frågans antaganden och undvika påhittad tröskelpassage | ROIC-frågan och kontrollpar |
| Generella metodsvar granskades med Haiku som felblockerade korrekta samband | Metod, tolkning och beräkning granskas med Sonnet; rena luckbesked behåller snabb granskning | Samma analysförmåga för metod som för tolkning | Endpoint-test och skarpa kontrollpar |
| Långa svar och upprepade luckor | Mål om normalt högst 180 ord för vanlig förklaring, 250 i djupgranskning; ingen automatisk kapning | Mer koncentrerade svar som fortfarande kan vara utförliga när det behövs | Oförändrade provgränser och manuell läsning |

Sonnet-generatorn får medium effort och 4096 max_tokens eftersom även
modellens tänkande räknas mot tokenutrymmet. Befintlig tids- och anropsbudget
behålls. Fallback registrerar en begränsad felkategori och HTTP-status utan
leverantörens feltext. Detta är diagnostik, inte en garanti mot fallback.

Serverns kontroller av postreferenser, belopp, tecken, perioder och ursprung
är kvar. Strikt JSON-form säger ingenting om att resonemanget är korrekt.
Prosagrindens tidsregel har inte lättats.

## Provhistorik

- Produktionens första tre korrekta UTF-8-frågor: ett svar blandade ihop
  kassaflödeskategorier och ett ROIC-svar blockerades. Se
  `fraga-avancerade-resultat-2026-09-09.md` för fullständiga svar.
- Baslinje 34357872529, kod 5ee2337: skalfördelar 421 ord, säsong 218 ord,
  ROIC blockerad efter upprepat felstavat stödfält. Fyra gamla kontrollfall
  passerade. Det blockerade råsvaret hade även obelagda ekonomiska slutsatser;
  att rätta formen räcker därför inte.
- Första ändringen, 34358411217 på 52140c6: alla tre gav svar utan fallback
  eller formatreparation. Svaren hade 302, 168 och 339 ord. ROIC överskred
  provets längdgräns. Tre av de sex nya metodkontrollerna felblockerades eller
  fick avklippt granskarbesked med Haiku. Det motiverade nästa rättning.
- Körning 34358846587 avbröts när ett lokalt test visade att den nya
  längdinstruktionen lagts efter registrets JSON och bröt testharnessens
  avläsning. Flyttad före systemtexten i 10edd91. Den avbrutna körningen
  används inte som ett lyckat jämförelseresultat.
- Avslutande avancerad körning: 34358926063 på 10edd91.
- Avslutande rapport-/beräkningskörning: 34359003724 på samma kod.
  Ett summasvar blockerades av bokstavliga Unicode-escapes för svenska
  bokstäver; följdfrågan kunde därför inte provas. Två andra svar föll tillbaka
  till Haiku. Alla tio granskarfall gav rätt beslut.
- 34358926063: tio av tio granskarfall gav rätt beslut, men ROIC stoppades
  efter en hänvisning till en oläst lektion och en trasig reparerad text.
  En motsägelse rättades i kursText: hela kurslistan är sökkatalog, endast
  laddade kursposter får namnges som hänvisningar i svaret.
- 34359611713 på 2243cf4: tre av tre frågor fick svar utan fallback eller
  formatreparation. Längderna var 295, 205 och 264 ord; ROIC överskred fortsatt
  provgränsen 220 ord. Tio av tio granskarfall gav rätt beslut. Manuell läsning
  hittade fortfarande ett obelagt antagande att utdelningsbolaget saknar
  lönsamma projekt. Detta räknas inte som fullgod analyskvalitet.
- c98ad6c återställer bokstavliga Unicode-escapes för enbart å, ä, ö och deras
  versaler före oförändrad prosa- och sakgranskning. Regressionstestet föll
  före rättningen och passerar efter; kodade belopp och vanliga belopp stoppas.
  92 berörda tester passerar. Skarp rapportkörning: 34359765846.
  Den körningen klarade åtta av åtta svar och tio av tio granskarfall, utan
  modellfallback. Summeringen fick 54 ord förklaring, följdfrågan 41 och
  djupgranskningen 146. Både svar och logg har lästs.
  **Manuell underkänning trots grönt automatiskt prov:** djupsvaret påstod
  att omsättningen fördubblades varje kvartal, trots serien 10, 20, 30, 40.
  Det är fel och släpptes igenom av granskaren. Automatiskt 8/8 betyder därför
  bara att de kodade provkraven uppfylldes, inte att alla svar var korrekta.

Lokala projektkontroller och bygge (278 sidor) är gröna. Den fulla sviten
före de sista två regressionstesten hade 548 tester, 546 gröna och endast
de två sedan tidigare kända prospekt_arbete/user_id-felen. De sista ändringarna
har körts med 92 berörda tester. Ingen förbättring av databasproblemen ingår.

## Nästa avgränsade steg

0. Prioritera finansiella relationer uttryckta i ord: fördubbling, halvering
   och acceleration är beräkningspåståenden även utan utskrivna siffror.
   Knyt sådana utsagor till serverberäknade jämförelseposter och låt servern
   formulera den verifierade relationen. Prova exempelvis att 10, 20, 30, 40
   godkänner fördubbling mellan de första perioderna men underkänner varje
   kvartal. Kontrollera omfattningen lika strikt som själva kvoten.
1. Pröva outtalade premisser med kontrastpar. Exempel: utdelning visar inte
   i sig att lönsamma investeringsmöjligheter saknas. Lägg till det negativa
   fallet och en korrekt villkorad formulering innan nästa promptändring.
2. Kortning behöver mätas på det färdiga svaret, inte bara instrueras.
   Pröva en begränsad redigeringsrunda före sakgranskningen när svaret är
   onödigt långt eller upprepar luckor. Bevara postreferenser och viktiga
   antaganden och granska den slutliga texten på nytt. Ingen rå text får
   publiceras bara för att redigeringen misslyckas. Mät också extratid och
   kostnad; en extra modellrunda är inte gratis.
3. Fallback behöver skiljas efter registrerad felkategori. Ändra inte modell-id
   på grund av ett timeoutfel. Anpassa eventuell retry till kvarvarande budget
   först när den konkreta feltypen har verifierats i provet.

Ändringarna ligger på testgrenen. Ingen ny produktionsdeploy i denna omgång.

Detta är små prov, inte en statistisk uppskattning av framtida träffsäkerhet.
Flera saker ändrades tillsammans; förbättringen hos varje enskild ändring
kan inte isoleras med dessa körningar. Tekniska formatfel, sakfel,
felblockeringar och omständlighet ska fortsätta redovisas var för sig.
