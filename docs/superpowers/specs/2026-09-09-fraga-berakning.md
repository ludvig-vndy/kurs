# Fraga: berakning pa begaran

Foljer efter `2026-09-08-fraga-dataposter.md`, som redan pekade ut ett
berakningsverktyg som senare steg, och forutsatter den. Ror inte
`2026-09-08-fraga-samtalsminne.md` och kan byggas fore eller efter den.

## Problemet

Servern raknar redan. `harled()` i `_nyckeltal.js` ger fyra sorters harledning
(kvartalssteg, ar over ar, spann, kvot) plus nettominskning per manad och
manader kvar med kassan. `KVOTER` innehaller exakt tva marginaler. Resultaten
blir poster med `typ: 'beraknat'`, med formel, indata och kallor.

Allt det raknas INNAN modellen har last fragan. Fragan avgor alltsa inte vad
som raknas. Faller den utanfor listan finns ingen post, och modellen har tva
vagar: tiga, eller skriva talet i lopande text. Prosagrinden stanger den andra.
Kvar blir tystnaden, och den ser ut som en vagran att rakna.

Forsta skarpa korningen ar exemplet. Modellen hade kassan och
kvartalsforandringen som verifierade poster, raknade sjalv ut att pengarna
racker trettiotva manader, och skrev talet. Grinden stoppade det. Ratt beslut,
men det som stoppades var en RAKNING, inte en pahittad siffra.

## Det farliga ar inte aritmetiken

Fyra saker ar farliga, och ingen av dem blir sakrare av att modellen raknar
tyst i textstrommen:

- **Skala och enhet.** KSEK mot MSEK, per aktie mot totalt.
- **Period och slag.** Ett kvartal mot ett helar, ett balansvarde mot ett flode,
  ett forlangt rakenskapsar mot fyra kvartal.
- **Meningsfullhet.** Tva riktiga tal ger en riktig kvot som anda inte betyder
  nagot.
- **Ursprung.** Ett raknat tal ar vart, aldrig bolagets, och det far aldrig
  glida over till `rapporterat`.

Aritmetiken sjalv ar det enda i listan en dator gor perfekt. Darav hela
inriktningen: modellen bestaller, servern raknar.

## Karnbeslut

- **Modellen bestaller, servern raknar.** Verktyget `berakna` tar en operation
  och referenser till poster. Ingen operand ar ett tal skrivet av modellen. Ett
  tal i indata ar ett kontraktsbrott och avslas.
- **Sluten operationsmangd, ingen uttrycksmotor.** Varje operation bar sina
  egna giltighetsregler och sin egen formeltext pa svenska. En generisk
  uttrycksmotor skulle inte kunna veta att fyra kvartal i ett forlangt
  rakenskapsar inte summerar till aret, och skulle flytta tillbaka omdomet till
  modellen, alltsa dit det inte gar att prova.
- **Resultatet ar en vanlig post.** `typ: 'beraknat'`, med `indata`, `formel`,
  `kallor` och samma id-form som allt annat. Rendering, prosagrind och
  granskning behover inga undantag.
- **Avslag ar ett verktygssvar med skal, aldrig tystnad.** Modellen ska kunna
  beratta for lasaren varfor talet inte gar att ge.
- **Svagaste ursprunget vinner.** En rakning pa en egen uppgift ger ett
  resultat som vilar pa en egen uppgift.
- **`harled()` blir kvar.** Den ar en varm start: de vanligaste fragorna
  behover da inget extra varv.

## Operationerna

Gemensamt for alla: operanderna maste finnas i DENNA requests register,
rakningen sker pa det kanoniska vardet och aldrig pa `varde` i originalskala,
och resultatet kan aldrig bli `rapporterat`.

Forsta omgangen:

| Operation | Operander | Kraver | Resultat |
| --- | --- | --- | --- |
| `summa` | tva eller fler | jamforbara, slag `flode`, angransande och icke overlappande perioder | samma enhet, period `Q1 till Q4 2025` |
| `differens` | tva | jamforbara | samma enhet |
| `tillvaxt` | tva | jamforbara, och namnaren positiv | procent |
| `andel` | taljare, namnare | samma bolag, samma period, samma enhet, samma slag | procent |
| `per_manad` | en | slag `flode`, kand periodlangd | enhet per manad |

Andra omgangen, som infor sammansatta enheter:

| Operation | Operander | Kraver | Resultat |
| --- | --- | --- | --- |
| `produkt` | tva | exakt en operand ar ett antal (enheten `aktier`), den andra ett pris per enhet | prisets valuta |
| `kvot` | taljare, namnare | samma bolag, samma period | serverbenamnd sammansatt enhet |

`tillvaxt` kraver positiv namnare med flit: tillvaxt fran ett negativt
rorelseresultat ar inte tolkbart, och ett procenttal darifran ar varre an inget
tal alls. `produkt` ar fragan "vad ar mitt innehav vart", alltsa ett antal ur en
egen uppgift gangrat med en kurspost, och just den kombinationen ar skalet till
att proveniensregeln nedan maste finnas.

## Jamforbarhetskontraktet

`jamforbar()` i `_nyckeltal.js` ar INTE hela regeln, och far inte anvandas som
om den vore det. Den provar bolag, enhet och periodlangd for floden. Den provar
inte samma matt, for dess enda anropare grupperar redan pa matt innan den
anropas, och den provar inte slag, for slaget foljer av metriken i samma
gruppering. Ett modellstyrt verktyg har ingen av de forutsattningarna. Utan ett
fullstandigt kontrakt kan alltsa omsattning och likvida medel bli operander till
`tillvaxt`, och svaret skulle se lika verifierat ut som allt annat.

Kontraktet i sin helhet, som en egen funktion `jamforbara(a, b)` som BADA
anroparna delar:

1. samma `bolagId`,
2. samma `matt`,
3. samma `slag` (`balans` eller `flode`),
4. samma kanoniska enhet,
5. for `flode`: samma `langd`,
6. bada vardena andliga.

Ordet `typ` betyder olika saker pa de tva stallena, och den kollisionen ar
sjalva fallgropen: i `METRIKER` betyder `typ` balans eller flode, pa en
registerpost betyder `typ` ursprung. Berakningen far darfor aldrig lasa `typ`
for att avgora slag. Faltet ska heta `slag` pa posten, och `jamforbara()` ska
kasta pa en post som saknar det, aldrig gissa.

## Tre falt som posten saknar i dag

`registreraFakta` i `_faktaregister.js` slapper det kontraktet behover:

- **`slag`** (`balans` eller `flode`) finns som `typ` i `METRIKER` och tappas
  nar posten skrivs, just for att namnet redan ar upptaget av ursprunget.
- **`ar`, `kvartal`, `langd`** renderas till strangen `period` ("Q2 2026"). En
  berakning skulle behova tolka den strangen tillbaka till tal. Bar dem som
  egna falt bredvid den lasbara strangen i stallet.

## Proveniens

**Tva begrepp, inte ett.** Ett resultat ar ALLTID `typ: 'beraknat'`, for det ar
vad posten ar. Vad den VILAR pa ar en annan sak och maste bo i ett eget falt.
Skrevs bada i `typ` skulle det ena skriva over det andra, och den enda
formuleringen som gick ihop vore att resultatet inte ar en berakning.

Resultatet far darfor `vilar_pa`, med det svagaste ursprunget i hela kedjan,
id:na som bar det, och de antaganden som samlats pa vagen:

```
vilar_pa: { ursprung: 'egen_uppgift', poster: [<id>], antaganden: [<text>] }
```

Ursprungen rangordnas `illustration` 0, `antagande` 1, `egen_uppgift` 2, `kurs`
3, `dokument` 4, `rapporterat` 5. `beraknat` har ingen egen rang: en beraknad
operand bidrar med SITT `vilar_pa`, aldrig med sin `typ`. Utan den regeln racker
ett mellanled for att dolja en egen uppgift bakom ordet beraknat, och tvattningen
sker i led tva i stallet for i led ett.

Av samma skal provas forbudet mot `illustration` tillsammans med `rapporterat`
pa den PLATTADE lovmangden, alltsa de ursprungliga posterna langst ner i kedjan,
inte pa de direkta operanderna. Det avslas, det ar inte en nedgradering: ett
pahittat exempel som raknas ihop med ett riktigt tal tvattas annars till nagot
som ser ut som data.

Ett resultat som vilar pa nagot svagare an `dokument` ska bara sitt skal i
klartext, sa ytan kan visa "vilar pa din egen uppgift om antal aktier" i stallet
for att bara visa talet.

## Avslag ar ett svar

Verktyget svarar med en mening som gar att ge vidare: "Q4 2025 och helaret 2025
ar inte jamforbara, den ena perioden ar ett kvartal och den andra fyra." Da kan
modellen skriva ett `saknas`-block som forklarar for lasaren varfor talet inte
gar att ge. Det ar battre an dagens tystnad, och battre an ett blockerat svar.

Skalen loggas i `tackning.berakningar`, sa vi kan se vilka avslag som ar
vanligast och om nagot av dem egentligen ar en regel som sitter for hart.

## Resultatets datakontrakt

Ett resultat maste kunna vara operand, annars ar kedjning bara ett ord. Da
maste det bara ALLT som `jamforbara()` fragar efter, och det gor dagens
beraknade poster inte:

- **`normaliserat` saknas pa dem.** `registreraFakta` skriver `normaliserat` for
  rapporterade poster, men `harled()`-posterna far bara `varde` och `enhet`.
  Regeln "rakna pa `normaliserat`" skulle alltsa falla pa den forsta kedjade
  operanden. Antingen skriver berakningen `normaliserat` pa sina resultat och
  steg tva backfillar `harled()`-posterna, eller sa byter kontraktet namn till
  ett kanoniskt varde som varje operand maste ha. Det senare ar renare.
- **Perioden ar harledd, inte arvd.** `summa` spanner over operandernas
  ytterkanter, `differens` och `tillvaxt` namner bada andpunkterna, `andel` och
  `kvot` arver den delade perioden, `per_manad` arver sin operands. Resultatet
  bar `ar`, `kvartal` och `langd` nar de gar att harleda, annars ingen av dem,
  och da ar posten inte jamforbar med nagot.
- **Slaget foljer operationen.** `summa` och `differens` behaller operandernas
  slag. `tillvaxt` och `andel` ger ett dimensionslost tal och far slag `kvot`,
  som aldrig ar operand till `summa` eller `differens`. `per_manad` ger `takt`.
- **`djup` star pa posten.** Ett resultat har djup 1, ett resultat med en
  beraknad operand djup 2, och djup 3 avslas.
- **Nollnamnare och icke andliga resultat ar avslag, inte poster.** Delning med
  noll, `Infinity` och `NaN` far aldrig registreras. Det galler ocksa
  `tillvaxt` fran noll, som inte ar oandlig tillvaxt utan en odefinierad kvot.
- **Avrundning sker en gang, sist.** Det kanoniska vardet bar full precision
  genom hela kedjan, och avrundas forst nar posten renderas. Avrundas varje led
  driver ett tvastegssvar ifran sitt eget underlag, och formeln visar da en
  rakning som inte gar ihop.

## Budget och varv

- `berakna` raknar INTE upp `gravvarv`. Den hamtar ingenting och ska inte ata
  gravbudgeten (`MAX_VARV = 2`). Egen rakning, `MAX_BERAKNINGAR = 6` per
  request.
- **Men rakningen ar gratis bara lokalt.** Varje verktygsvarv kraver ett nytt
  modellanrop, sa sex berakningar ar upp till sex extra anrop. Utan ett tak pa
  helheten skulle ett eget varvstak per verktyg bara flytta kostnaden. Det ska
  darfor finnas ett HART tak pa antalet modellanrop per fraga, och loopens
  ovre grans raknas ur det taket, inte ur summan av delbudgetarna.
- Varje resultat ar en registerpost och lyder under samma bytetak som allt
  annat.

## Grindarna

- Prosagrinden ar oforandrad. Ett raknat tal ar en post, och poster renderas av
  servern.
- Granskaren far resultatet med sin formel i `tillgangligt`. Dess uppgift ar
  INTE att kontrollera aritmetiken, den ar kod och tackt av tester. Dess uppgift
  ar att doma om rakningen ar MENINGSFULL: ratt matt for fragan, rimlig period,
  inte en kvot mellan tva tal som rakade finnas.
- Ett raknat tal utan ett `tolkning`-block ar ett halvt svar. Kontraktet ska
  saga det.

## Ytorna

- `renderaPost` visar redan `Sa raknades det:` for `formel`. En kedja ska visas
  som flera rader, inte som en mening.
- Kallorna ar unionen av indatas kallor, sa ett raknat tal gar att folja hela
  vagen till rapporten.
- Ett resultat som vilar pa en egen uppgift eller ett antagande ska marka det i
  ytan, inte bara i datan.

## Risker som ska sta i koden

- **En giltig rakning kan vara meningslos.** Reglerna provar jamforbarhet, inte
  relevans. Relevansen ar granskarens och lasarens sak, och det ska sta.
- **Den slutna mangden ar avsikten, inte en begransning att bygga bort.** Varje
  ny operation ar en ny regel som ska ga att prova utan modell.
- **Kedjor doljer antaganden.** `antagande`-texter maste folja med uppat, annars
  forsvinner "forutsatter oforandrad takt" i led tva.
- **Fler poster ar en dyrare prompt.** Resultaten konkurrerar med dokumenten om
  samma utrymme.

## Byggordning

1. `jamforbara(a, b)` med hela kontraktet, i `_nyckeltal.js` eller i en modul
   bada delar. `harled()` byter till den; grupperingen pa matt gor bytet
   verkningslost dar, vilket ar poangen med att gora det forst.
2. `slag`, `ar`, `kvartal` och `langd` in i `rapporterat`-posten, och ett
   kanoniskt varde pa BADE rapporterade och beraknade poster, med test pa att
   befintlig rendering ar oforandrad.
3. `functions/api/_berakning.js`: operationerna, giltighetsreglerna,
   formeltexterna, `vilar_pa` och kedjeplattningen. Ren modul, inga anrop,
   testbar utan modell och utan natverk.
4. Registret far `laggBeraknad`, som satter `vilar_pa` ur indatas kedjor och
   vagrar okanda id:n, for stort djup och icke andliga varden.
5. `berakna` i `verktygsDefinitioner` och `byggKorVerktyg`. Egen varvsrakning,
   det harda taket pa modellanrop, avslag som text, `tackning.berakningar`.
6. Kontraktstexten: nar modellen ska bestalla en rakning i stallet for att tiga,
   och att den aldrig skriver talet sjalv.
7. Ytan: kedjeformel och markning av svagt ursprung.
8. `produkt` och `kvot`, som forst kraver kursposten och sammansatta enheter.
9. Skarp provkorning via `prova-fraga`: en marginalfraga, en summering av
   jamforbara kvartal, och Unibaps forlangda rakenskapsar, som fortfarande ska
   avslas med skal.

Begransning: berakningen gor svaren fylligare, inte sannare. Ett raknat tal ar
exakt sa bra som extraktionen av sina indata, och den lasningen ar fortfarande
regex over rapporttext. Att formeln syns gor felet upptackbart, inte omojligt.
