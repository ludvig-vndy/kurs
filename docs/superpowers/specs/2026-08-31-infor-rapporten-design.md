# Inför rapporten: design

**Datum:** 2026-08-31
**Status:** spec, ej byggd. Reviderad efter granskning samma dag.
**Hör ihop med:** `motor/natt.mjs` (nattjobbet), `motor/narrera-brev.mjs` (brevets prosa),
`motor/bevakningslista.mjs` (innehav till bevakning), `supabase/migrations/20260830150000_tes.sql`
(tes-fältet), `functions/api/fraga.js` (attributionsregeln)

---

## 0. Vad som ändrades i revisionen

Granskningen fällde nio saker, och alla utom en är rena designfel i första versionen,
inte puts. Den centrala missen går igenom fem av dem:

**Specen blandade ihop tre lager som måste hållas isär.** Ett kalenderfaktum ("Sivers
Q3 2026 rapporteras 6 november"), en användarkontext ("Ludvig äger Sivers och har tes Y")
och ett leveransfaktum ("förrapportnotisen skickades till Ludvig i brev N") låg i samma
`aviserad: false` på bolagsnivå. Med två piloter som äger samma bolag är det trasigt vid
första körningen. Avsnitt 2 är den nya bärande strukturen och avsnitt 4 till 6 är de tre
lagren var för sig.

Övriga fällda punkter:

1. Ett bolag kunde bara ha ett kalendertillstånd, så ett utskick med både Q3 och Q4
   raderade det första. Nu event per period. Avsnitt 4.
2. `period` var fri text men användes som identitet. "andra kvartalet", "Q2" och
   "delårsrapport januari till juni" är samma period. Nu normaliserad `periodnyckel`
   vid sidan av originaltexten. Avsnitt 4.
3. Presentationsdatum behandlades som rapportdatum. Avsnitt 4 och 0.2.
4. Triggerregeln var inte bara vag, den var omöjlig. Avsnitt 7.
5. Beviskedjan för året var inte komplett: citatet bevisade dagen men inte året.
   Avsnitt 4.
6. Fail-open på teshämtningen producerade ett falskt påstående. Nu trevärd status.
   Avsnitt 5.
7. Backfillen saknade tidssemantik. "Nyast vinner" fick betyda "senast processad fil".
   Avsnitt 4.
8. En faktisk rapport kunde inte stänga ett kalender-event, så en flyttad rapport kunde
   ge en notis om något läsaren redan läst. Avsnitt 8.
9. Väg (a) i narrationen beskrevs som "bara en omformulering av läsarens ord". Det är
   den inte, den är analys. Nu strikt extraktiv. Avsnitt 9.

### 0.1 Premissen: rapportdatum finns redan i vårt eget flöde

Första versionen sa att datumen måste köpas av Börsdata, eftersom "Rapportdatum och
kommande rapporter" står i deras nivå 1. Det stämmer inte.

`motor/faltlistor.mjs:58` klassificerar bort inbjudnings- och kalenderutskicken som
`ovrigt`, så att "inbjudan till presentation av bokslutskommuniké" inte ska förväxlas
med en rapport. Regeln är rätt. Men de dokumenten är de enda som säger när nästa
rapport kommer, och vi slänger dem.

**Mätt täckning: 9 av 15 bolag** har minst ett kalenderutskick i arkivet. Siffran är
förvirrad av arkivdjupet: av de sex bolag med fler än 40 dokument har fem sådana
utskick (Evolution är undantaget), medan de sex som saknar helt mestadels bara har sju
dokument arkiverade. Djupare backfill lyfter troligen siffran, men aldrig till hundra
procent. Det avgör designen i avsnitt 12.

Börsdatas kalender vore alltså ett **komplement för svansen**, inte det som möjliggör
funktionen. Argumentet ska inte användas för att motivera abonnemanget.

### 0.2 Publiceringsdatum finns, och den strikta regeln är prisvärd

Granskningen påpekade att första versionens eget bevis inte höll. Citatet

> Axfood bjuder in investerare, analytiker och press till en presentation av
> delårsrapporten för det andra kvartalet 2026 kl 9:30 den 15 juli.

bevisar att **presentationen** är den 15 juli, inget annat. Att använda det som
rapportdatum är precis den gissning specen förbjuder.

Vid ommätning visade sig utskicket dock fortsätta:

> Rapporten publiceras kl 7:00 samma dag.

Alltså finns påståendet, det stod bara inte i den mening jag citerade.

**Mätt över de 50 kalenderutskick som finns lokalt i `motor/in/`: 31 har en mening som
säger att rapporten publiceras ett visst datum, 9 har bara ett presentations- eller
samtalsdatum, 10 har inget månadsdatum alls.**

Det avgör frågan: den strikta regeln kostar täckning men dödar inte funktionen. De 9
faller bort, och det är rätt utfall.

Notera formen "samma dag". Publiceringspåståendet är ofta **relativt** till
presentationsdatumet i föregående mening. Extraktionen måste kunna lösa upp det, och
det är ett eget testfall.

---

## 1. Vad funktionen är

En notis i morgonbrevet, ett par dagar innan ett av läsarens bolag rapporterar, som
säger att rapporten kommer och vad i den som prövar läsarens egen tes.

Tes som namnger ett mått:

> Sivers rapporterar på torsdag. Din tes säger att bruttomarginalen ska normaliseras.
> Rapporten innehåller den raden.

Tes som inte namnger något mått:

> Sivers rapporterar på torsdag. Din tes säger att bolaget ska återhämta sig, men inte
> vad i rapporten som skulle visa det.

Ingen tes:

> Sivers rapporterar på torsdag. Du har inte skrivit ner varför du äger bolaget. Gör
> det innan rapporten kommer, så har du något att pröva den mot.

Tesen otillgänglig (driftfel):

> Sivers rapporterar på torsdag.

Det är hela funktionen. Ingen prognos, inga tal, inget råd.

---

## 2. Tre lager, aldrig blandade

Det här är specens bärande struktur och det första versionen saknade.

| Lager | Påstående | Lever i | Gäller |
| --- | --- | --- | --- |
| **Kalenderfaktum** | "Sivers Q3 2026 rapporteras 6 november enligt källa X" | `motor/in/kalender.json` | alla |
| **Användarkontext** | "Ludvig äger Sivers och har tes Y" | Supabase `holdings` + `theses` | per användare |
| **Leveransfaktum** | "Notisen för Sivers Q3 2026 gick till Ludvig i brev N" | `motor/in/aviseringar.json` | per användare och event |

Kalenderfaktumet vet ingenting om användare. Leveransfaktumet vet ingenting om varför
notisen skickades. Att `aviserad` låg i kalenderposten betydde att den förste
användarens brev konsumerade den andres notis.

---

## 3. Klassificeringen

Ny typ `kalender` i `motor/faltlistor.mjs`. Mönstret på rad 58 leder i dag till
`ovrigt`; det ska leda till `kalender`. Ordningsgarantin står kvar: brusmönstren prövas
före `rapport`, så en inbjudan blir aldrig en rapport.

Extraktionen använder befintlig maskin: `extraheraLLM` med `FALT`-post och citatkrav,
sedan `verifiera`.

---

## 4. Lager 1: kalenderfaktum

### Formen

Ett dokument kan innehålla flera framtida rapportdatum, så utdata är en **mängd event**,
inte ett datum.

```json
{
  "sivers-semiconductors": {
    "2026-Q3": {
      "rapportdatum": "2026-11-06",
      "periodtext": "tredje kvartalet 2026",
      "periodar": 2026,
      "kalla": "https://mfn.se/...",
      "kallaPublicerad": "2026-10-14T07:00:00Z",
      "bevis": {
        "dag": "Rapporten publiceras den 6 november.",
        "ar": "Delårsrapport för tredje kvartalet 2026"
      },
      "stangdAvRapport": null
    }
  }
}
```

### Periodnyckeln

`periodtext` behålls ordagrant för spårbarhet. Identiteten är `periodnyckel`, normaliserad
till `<år>-Q1` till `<år>-Q4`, `<år>-FY`, eller `okand`. Ett event med `okand` lagras men
aviseras aldrig.

Sectra i vårt eget arkiv visar varför normaliseringen inte är trivial: "nine-month report
2025/2026" är ett brutet räkenskapsår. För brutna år används **det räkenskapsår bolaget
självt anger**, ordagrant ur dokumentet, aldrig kalenderåret som gissning. Går det inte
att avgöra blir nyckeln `okand`.

### Två år, inte ett

`periodar` (vilken period rapporten avser) och året i `rapportdatum` (när den publiceras)
är olika saker. "Bokslutskommuniké för 2026 publiceras 12 februari 2027" ger `periodar`
2026 och `rapportdatum` 2027-02-12. Första versionen hade ett enda `ar` och hade blandat
ihop dem.

### Rapportdatum är inte presentationsdatum

Två skilda fält, och **bara `rapportdatum` driver funktionen.**

För att ett datum ska bli `rapportdatum` måste citatet semantiskt hävda att rapporten
publiceras, offentliggörs, släpps eller lämnas den dagen. Att en presentation, webbsändning,
telefonkonferens eller ett investerarsamtal hålls den dagen räcker inte, även om det i
praktiken oftast är samma dag.

Relativa formuleringar ("Rapporten publiceras kl 7:00 samma dag") får lösas upp mot ett
datum som står i samma dokument, och då ska båda meningarna in i `bevis.dag`.

Ett dokument som säger "Rapporten publiceras den 14:e. Presentation hålls den 15:e" ska ge
`rapportdatum` = den 14:e. Det är ett obligatoriskt negativt testfall.

### Beviskedjan måste täcka hela datumet

Första versionen definierade `citat` som "meningen datumet kom ur". Det räcker inte:
året står ofta i rubriken medan meningen bara säger "15 juli". Då är ISO-datumet giltigt
enligt reglerna medan citatet läsaren ser bevisar fel sak.

Därför är `bevis` uppdelat, och **varje komponent i datumet måste ha täckning**. Saknas
täckning för året kastas eventet. URL-sluggen får vara stöd, aldrig enda källa: Lifcos
slug innehåller "14-juli" men inget år, och en slug är inte ett uttalande från bolaget.

### Konfliktlösning

Ett nyare event för **samma bolag och samma periodnyckel** vinner. "Nyare" avgörs av
`kallaPublicerad`, alltså källans publiceringstid, **aldrig av processordning**. Steg 1
körs över hela arkivet i godtycklig ordning och slutstatet måste bli detsamma oavsett.

Vinner ett nytt event med ett annat `rapportdatum` rensas leveransfaktumet för det
eventet, se avsnitt 6.

### Historik aviseras aldrig

Arkivet innehåller passerade rapportdatum. De får lagras, men **endast event med
`rapportdatum` i framtiden och `stangdAvRapport === null` är aviseringskandidater.** Ett
historiskt event utan avisering får aldrig väckas av triggern.

---

## 5. Lager 2: användarkontext

`motor/bevakningslista.mjs` läser i dag `holdings?select=name,ticker,relation,user_id`.
Den saknar `id`, som behövs för att slå mot `theses.holding_id`.

1. `hamtaInnehav` väljer `id,name,ticker,relation,user_id`.
2. Ett andra anrop hämtar `theses?select=holding_id,why`.
3. Varje bolag får `teser: { "<user_id>": { status, why } }` vid sidan av `agare`.
4. `brevForAgare(uid)` i `motor/natt.mjs` läser `b.teser[uid]`.

**Kardinalitet:** `theses` har `unique (holding_id)` i migrationen, alltså högst en tes per
innehav. Det är garanterat i databasen och behöver ingen tie-break i koden. Ändras det
någon gång måste den här specen ändras med.

**Användargränsen:** delningen sker redan i `brevForAgare`, och tesen måste följa samma
gräns. En tes får aldrig lämna sin ägares brev. Det är samma läcka som lagades 2026-08-30
när två piloter såg varandras portföljer, i en ny form, och den har ett eget testfall.

### Tesstatus är trevärd

Första versionen sa att nattjobbet skulle fortsätta utan teser om anropet föll. Men formen
utan tes säger "du har inte skrivit ner varför du äger bolaget", vilket är ett påstående vi
inte vet är sant. Ett 500-svar betyder inte att användaren saknar tes.

| Status | Betyder | Notisen |
| --- | --- | --- |
| `FUNNEN` | tesen är hämtad | full form, avsnitt 9 |
| `BEKRAFTAT_TOM` | anropet lyckades, ingen rad fanns | påminnelsen om att skriva en tes |
| `OTILLGANGLIG` | anropet föll (404, 500, timeout) | bara rapportdatumet, inget om tesen |

`OTILLGANGLIG` får aldrig använda texten för `BEKRAFTAT_TOM`. Funktionen degraderar, den
ljuger inte.

---

## 6. Lager 3: leveransfaktum

Egen fil, `motor/in/aviseringar.json`, med deterministiska id:n:

```
forrapport:<user_id>:<bolag>:<periodnyckel>:<rapportdatum>
```

Rapportdatumet ingår i nyckeln med flit: flyttas datumet blir id:t ett annat och notisen
får gå ut igen. Det löser punkten i avsnitt 4 utan särskild rensningslogik.

**När räknas notisen skickad:** när brevet är skrivet till `motor/out/brev-<uid>.json`, inte
när det renderades. Kraschar körningen efter första användarens brev ska nästa körning
skicka de återstående och inte dubblera den redan skrivna. Id:t gör retryn idempotent.

Det här behöver ingen kö och ingen databas. En JSON-fil med deterministiska nycklar räcker
för ett nattjobb med några användare, och kravet är att en omkörning ger samma utfall.

---

## 7. Triggeralgoritmen

Första versionen sa "två till tre dagar före, och om dagen faller på helg tas närmast
föregående brevdag". Den regeln går inte att uppfylla. En rapport på en tisdag ger två
dagar före = söndag och tre dagar före = lördag, och närmast föregående brevdag är fredag,
alltså fyra dagar. Implementationen kan inte följa båda villkoren.

Den faktiska algoritmen:

```
mal = rapportdatum minus 2 kalenderdygn
om mal inte är en brevdag: gå bakåt dag för dag till närmaste brevdag
avisera på den dagen
```

Konsekvensen accepteras uttryckligen: en helg eller helgdag gör framförhållningen längre än
två dagar. Det är rätt riktning att fela åt, en notis får hellre komma för tidigt än för
sent.

En brevdag är en dag då nattjobbet skriver brev. Skriver det varje dag är bakåtvandringen en
tom operation, och algoritmen är ändå den som ska implementeras och testas.

Varför två dagar och inte samma morgon: en notis samma morgon är en notis, inte en
förberedelse. Varför en enda gång: en påminnelse varje dag fram till rapporten är precis den
tjatiga notistjänst produkten inte ska vara.

---

## 8. Rapporten stänger eventet

Kommer en verifierad `rapport`-post för ett bolag sätts `stangdAvRapport` på det matchande
kalender-eventet, som därefter aldrig är aviseringskandidat.

Utan det: kalendern säger 20 november, bolaget flyttar tyst till den 17:e, rapporten kommer
och vårt rapportflöde hittar den, och den 18:e säger brevet "Sivers rapporterar om två
dagar" om något läsaren redan läst. Det är värre än att missa en notis.

Matchningen sker på bolag plus periodnyckel. Går perioden inte att avgöra ur rapporten
stängs det event för bolaget vars `rapportdatum` ligger närmast rapportens datum inom sju
dagar, och ingenting annars. Hellre en kvarliggande post än en felaktigt stängd.

---

## 9. Narrationen

Ett tredje läge i `motor/narrera-brev.mjs`, vid sidan av `SYSTEM` och `SYSTEM_TYST`. Alla
befintliga absoluta regler gäller oförändrat: inga tal, inga råd, inga tankstreck, aldrig
räkna, bara skeenden ur underlaget.

Fyra regler till:

1. **Förutsäg aldrig utfallet.** Inte vad siffrorna blir, inte åt vilket håll, inte att
   något "väntas". Notisen säger att rapporten kommer, aldrig vad den innehåller.
2. **Tesen är läsarens, aldrig ett faktum.** Skriv "din tes säger", "du skrev". Presentera
   aldrig något ur tesen som något bolaget rapporterat. Samma regel som `SYSTEM_TES` och
   `TES_ATTRIBUTION` i `functions/api/fraga.js`, formulerad likadant så ytorna inte glider
   isär.
3. **Inga tal ur tesen.** Har läsaren skrivit "37 procents bruttomarginal 2029" säger
   notisen "bruttomarginalen", aldrig talet.
4. **Ingen handling före rapporten.** Aldrig "se över din position", "överväg", "var beredd".
   Det är handelsråd i förklädnad.

### Strikt extraktiv, och varför

Första versionen lät modellen gå från "marknaden prisar som om ordrarna aldrig kommer
tillbaka" till "orderingången prövar det", och kallade det en omformulering av läsarens egna
ord. **Det är det inte.** Att välja vilken rapportrad som bäst testar en tes är analys.
Satellitordrar kan synas i orderingång, orderbok, segmentomsättning, kundkoncentration eller
inte separat alls.

Regeln blir därför: **modellen får bara namnge mått som läsaren själv uttryckligen har
nämnt.** Skriver läsaren "bruttomarginalen normaliseras" får notisen säga bruttomarginalen.
Skriver läsaren "USA-affären vänder" får den inte välja ett mått åt läsaren.

Första versionens fallback (b), en fast lista mått per bolagstyp, stryks helt. Den var vårt
omdöme om ett namngivet bolag förklätt till hjälpsamhet.

Vid vag tes är rätt utdata att säga just det:

> Din tes säger att bolaget ska återhämta sig, men inte vad i rapporten som skulle visa det.

Det är inte en degradering, det är produktens idé. En tes som inte går att pröva är en tes
värd att skriva om, och att säga det är mer värt än att uppfinna ett testkriterium åt läsaren.

Regeln är dessutom grindbar: varje mått notisen nämner ska gå att hitta i tesens text.

---

## 10. Framåt: testkriteriet hör hemma i tesen

Att förrapportjobbet uppfinner testkriteriet på nytt varje kvartal är fel lager.
`theses.invariants` finns redan i migrationen (`jsonb not null default '[]'`, kommenterad
`fylls i Fas 2`) och är rätt hem för det: läsaren anger vad som skulle motbevisa tesen när
tesen skrivs.

Då blir förrapportnotisen ren uppslagning i stället för tolkning, och avsnitt 9 blir enklare
i stället för mer tillåtande. Det byggs inte nu, men datamodellen ska inte göra det svårare.

---

## 11. Vad funktionen inte ska göra

- Inte förutsäga rapporten.
- Inte ranka vilka rapporter som är viktigast.
- Inte påminna mer än en gång per event.
- Inte notifiera utanför brevet. Ingen push, inget mejl av egen kraft.
- Inte finnas för bolag utan verifierat rapportdatum. Tystnad är ett besked, en gissad
  rapportdag är det inte.

---

## 12. Kända luckor

1. **Täckningen blir inte fullständig.** 9 av 15 bolag har kalenderutskick, och av 50
   utskick har 31 ett publiceringsdatum. Bolag utan sådana utskick får ingen notis.
   Ingenting i brevet får antyda att frånvaron av notis betyder att ingen rapport kommer.
2. **Datum kan flyttas tyst.** Hanterat av avsnitt 8, men bara efter att rapporten kommit.
   Citatet och källänken ska med i brevet så läsaren kan se varifrån datumet kom.
3. **Backfill behövs.** Sex bolag har bara sju arkiverade dokument. Kalendern blir inte
   användbar förrän arkivet går djupare.
4. **Tesen kan vara gammal.** En tes skriven för ett år sedan prövas mot dagens rapport utan
   att någon säger att den är gammal. Avsnitt 10 löser det på sikt.
5. **Brutna räkenskapsår ger `okand` oftare** än kalenderårsbolag, och `okand` aviseras
   aldrig. Sectra är exemplet i vårt eget arkiv.

---

## 13. Byggordning

Inget syns för läsaren förrän steg 5.

1. **Klassificering och extraktion.** `kalender`-typ, fältlista, `rapportdatum` skilt från
   `presentationsdatum`, beviskedjan, periodnormaliseringen. Körs över hela arkivet.
   Mätvärde: hur många giltiga event av de 50 kända utskicken, och hur många som faller på
   saknat årsbevis eller på att bara presentationsdatum finns.
2. **Kalenderfaktumet.** `kalender.json`, event per periodnyckel, konfliktlösning på
   `kallaPublicerad`, historik aldrig aviserbar. Ren funktion, testbar utan nätverk.
3. **Leveransfaktumet.** `aviseringar.json`, deterministiska id:n, triggeralgoritmen,
   idempotent omkörning. Också ren funktion.
4. **Användarkontexten.** `id` i selecten, teshämtningen, trevärd status, användargränsen.
   Degraderar till `OTILLGANGLIG` om migrationen inte är körd.
5. **Narrationen och ytan.** Tredje läget, de fyra reglerna, den extraktiva grinden, posten
   i brevet med citat och källänk.

Steg 2 och 3 är avsiktligt skilda åt. Det var deras sammanblandning som var första versionens
centrala fel.

---

## 14. Testning

**Kalenderfaktum**
- Ett utskick med tre framtida rapportdatum ger tre event.
- Q4 offentliggörs innan Q3 inträffat: båda överlever.
- "andra kvartalet" i en källa och "Q2" i nästa ger samma periodnyckel.
- Arkivet processas i slumpmässig ordning och ger samma slutstate.
- Ett gammalt dokument som processas efter ett nytt flyttar inte datumet bakåt.
- Samma release processad två gånger ger samma state.
- "Rapporten publiceras den 14:e. Presentation hålls den 15:e" ger den 14:e.
- Ett utskick med bara presentationsdatum ger inget event.
- "Rapporten publiceras kl 7:00 samma dag" löses upp mot föregående mening.
- Året står bara i rubriken: eventet accepteras bara om `bevis.ar` täcker det.
- Bokslut för 2026 som publiceras i februari 2027 ger `periodar` 2026 och rapportdatum 2027.
- Ett passerat rapportdatum utan avisering aviseras aldrig.
- Sectras brutna räkenskapsår ger antingen rätt nyckel eller `okand`, aldrig fel år.

**Leverans och trigger**
- Rapport på tisdag: måldagen beräknas enligt algoritmen, inte enligt intention.
- Två användare äger samma bolag: båda får notisen, oberoende av varandra.
- Körningen kraschar efter första användarens brev: nästa körning skickar bara den andres.
- Körningen körs två gånger efter lyckad leverans: ingen dubblett.
- Datumet flyttas efter första notisen: nytt id, ny notis.
- Faktisk rapport kommer före kalenderdatumet: eventet stängs och ingen notis går ut.

**Tes och narration**
- `theses` ger 500 trots att tesen finns: notisen säger bara rapportdatumet, aldrig att
  tesen saknas.
- Faktiskt tom tes: påminnelsen används.
- Tes som nämner ett mått: måttet får namnges.
- Tes som nämner ett affärsutfall men ingen rapporterad storhet: modellen får inte välja ett
  mått, och notisen säger att tesen inte pekar på något.
- Ett tal ur tesen läcker ut i notisen: fälls.
- En formulering som förutsäger utfallet: fälls.
- Ett handlingsråd: fälls.
- Två användare med olika teser på samma bolag: ingen ser den andras.
