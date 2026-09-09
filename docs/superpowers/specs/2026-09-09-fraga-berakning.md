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
rakningen sker pa `normaliserat` och aldrig pa `varde` i originalskala,
avrundningen sker pa ett stalle, och resultatet kan aldrig bli `rapporterat`.

Forsta omgangen:

| Operation | Operander | Kraver | Resultat |
| --- | --- | --- | --- |
| `summa` | tva eller fler | samma bolag, matt och enhet, slag `flode`, angransande och icke overlappande perioder | samma enhet, period `Q1 till Q4 2025` |
| `differens` | tva | `jamforbar()` | samma enhet |
| `tillvaxt` | tva | som `differens`, och namnaren positiv | procent |
| `andel` | taljare, namnare | samma bolag, samma period, samma enhet | procent |
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

## Tre falt som posten saknar i dag

`registreraFakta` i `_faktaregister.js` slapper det servern behover for att
doma jamforbarhet:

- **`slag`** (`balans` eller `flode`) finns som `typ` i `METRIKER` och tappas
  nar posten skrivs, eftersom `typ` pa posten redan betyder ursprung.
- **`ar`, `kvartal`, `langd`** renderas till strangen `period` ("Q2 2026"). En
  berakning skulle behova tolka den strangen tillbaka till tal. Bar faltena som
  egna falt bredvid den lasbara strangen i stallet.

`jamforbar()` i `_nyckeltal.js` kodar redan reglerna, inklusive den om att tva
bolags tal aldrig ar jamforbara med varandra. Berakningen ska anropa samma
funktion, inte en andra kopia som kan glida isar fran den.

## Proveniens

Ursprungen rangordnas: `illustration` 0, `antagande` 1, `egen_uppgift` 2,
`kurs` 3, `dokument` 4, `beraknat` 5, `rapporterat` 6. Resultatet far det
lagsta av sina indata.

En hard regel utover rangordningen: `illustration` far aldrig blandas med
`rapporterat`. Det avslas, det ar inte en nedgradering. Ett pahittat exempel som
raknas ihop med ett riktigt tal tvattas annars till nagot som ser ut som data.

Ett resultat under `dokument` ska bara sitt skal i klartext, sa ytan kan visa
"vilar pa din egen uppgift om antal aktier" i stallet for att bara visa talet.

## Avslag ar ett svar

Verktyget svarar med en mening som gar att ge vidare: "Q4 2025 och helaret 2025
ar inte jamforbara, den ena perioden ar ett kvartal och den andra fyra." Da kan
modellen skriva ett `saknas`-block som forklarar for lasaren varfor talet inte
gar att ge. Det ar battre an dagens tystnad, och battre an ett blockerat svar.

Skalen loggas i `tackning.berakningar`, sa vi kan se vilka avslag som ar
vanligast och om nagot av dem egentligen ar en regel som sitter for hart.

## Budget och varv

- `berakna` raknar INTE upp `gravvarv`. Den hamtar ingenting och kostar inget
  externt anrop, och ska inte ata gravbudgeten (`MAX_VARV = 2`). Egen rakning,
  `MAX_BERAKNINGAR = 6` per request, med eget stopp sa en modell som fastnar i
  rakning inte snurrar.
- Kedjning tillaten till djup 2. Ett resultat far vara operand, ett resultat av
  ett resultat far inte vara det. Formeln maste visa hela kedjan.
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

1. `functions/api/_berakning.js`: operationerna, giltighetsreglerna,
   formeltexterna och proveniensrangordningen. Ren modul, inga anrop, testbar
   utan modell och utan natverk. Anvander `jamforbar` ur `_nyckeltal.js`.
2. `slag`, `ar`, `kvartal` och `langd` in i `rapporterat`-posten, med test pa
   att befintlig rendering ar oforandrad.
3. Registret far `laggBeraknad`, som satter ursprung ur indata och vagrar
   okanda id:n.
4. `berakna` i `verktygsDefinitioner` och `byggKorVerktyg`. Egen varvsrakning,
   avslag som text, `tackning.berakningar`.
5. Kontraktstexten: nar modellen ska bestalla en rakning i stallet for att tiga,
   och att den aldrig skriver talet sjalv.
6. Ytan: kedjeformel och markning av svagt ursprung.
7. `produkt` och `kvot`, som forst kraver kursposten och sammansatta enheter.
8. Skarp provkorning via `prova-fraga`: en marginalfraga, en summering av
   jamforbara kvartal, och Unibaps forlangda rakenskapsar, som fortfarande ska
   avslas med skal.

Begransning: berakningen gor svaren fylligare, inte sannare. Ett raknat tal ar
exakt sa bra som extraktionen av sina indata, och den lasningen ar fortfarande
regex over rapporttext. Att formeln syns gor felet upptackbart, inte omojligt.
