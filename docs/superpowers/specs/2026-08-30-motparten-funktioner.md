# Motparten: funktionsöversikt

**Datum:** 2026-08-30
**Status:** inventering av det som finns, plus det som är planerat men inte byggt.
**Hör ihop med:** `docs/superpowers/specs/2026-08-22-motparten-saljkurs-design.md` (kursens
design), `docs/superpowers/specs/2026-08-29-saljcoachen-design.md` (coachen),
`docs/superpowers/specs/2026-08-30-saljverktyget-design.md` (tjänsten runt kursen),
`LAUNCH.md` (lanseringsblockerarna)

Siffrorna nedan är räknade ur källan 2026-08-30, inte uppskattade.

---

## 1. Byggt och live

### 1.1 Innehållet

| | |
| --- | --- |
| Kapitel | 12 |
| Lektioner | 42 |
| Steg totalt | 259 |
| Ordlista, termer | 6 |

Kapitelindelningen: Glöm det du lärt dig (5), Förtroende (4), Trygghet och risk (3),
Nyfikenhet (3), Frågor (4), Lyssnande (3), Problem och konsekvens (4), Värde (3), Beslut
och friktion (4), Integritet (3), Uppföljning (3), Självinsikt (3).

**Stegtyper i bruk:**

| Typ | Antal | Vad det är |
| --- | --- | --- |
| `intro` | 42 | ett per lektion, sätter frågan |
| `reading` | 94 | brödtext |
| `concept` | 77 | en avgränsad idé, kan bära en visual |
| `quiz` | 42 | ett per lektion |
| `myt` | 4 | ett rödlistat påstående med varifrån det kommer och vad som gäller |

**Evidensmärkning:** 36 steg bär `evidens`, fördelat 15 A, 15 B och 6 C. Varje A och B har
en källa i `docs/kallor/motparten-kallregister.md`, varje C saknar källa. Det kontrolleras
maskinellt, se 1.5.

**Grafik:** 25 visuals, samtliga av typen `jamforelse`. De fem andra visualtyperna som
Fokus-spelaren stöder (`rutnat`, `linjediagram`, `stapeldiagram`, `flode`, `andel`) används
inte i Motparten. Se 2.4.

### 1.2 Spelaren

Delad kod med aktiekursen. `src/components/kurs/Spelare.astro`, `KapitelSida.astro`,
`KursOversikt.astro`, `KapitelPlate.astro`. Rutterna under `src/pages/motparten/` är tunna
skal.

- Stegvis lektionsspelare, ett steg i taget, fram och tillbaka.
- **Quizgrind på 80 procent.** Under det går lektionen inte att markera som klar.
- **Marginalglosor:** termer ur ordlistan förklaras i marginalen, med länk till den lektion
  där termen introduceras. Evidensnoteringar renderas i samma marginal.
- Kapitelsidor med kapitelplåt (foto), kursöversikt, brödsmulor.
- Tillgänglighet: aria-etiketter på spelarens landmärken, respekterar
  `prefers-reduced-motion`.

### 1.3 Säljcoachen

`/motparten/coach`, `functions/api/coach.js`. Byggd och deployad.

- **Tvåstegsroutning utan embeddings.** Steg ett väljer lektioner ur ett register på 42
  rader. Steg två svarar på full text ur högst fem lektioner.
- **Korpusen** genereras ur källan med `node tools/bygg-korpus.mjs` till
  `functions/api/_korpus.js` och committas. Egen utvinning i
  `tools/lib/motparten-text.mjs`, medvetet skild från röstverktygets `stegProsa` som
  tappar visualtext, evidensnoteringar och myt-påståenden.
- **Två svarsformer utöver det vanliga:** `behover_mer` när underlaget inte räcker (en
  följdfråga, högst en kompletteringsrunda, hålls i minnet på sidan) och `inget_underlag`
  när kursen inte täcker frågan.
- **Deterministisk validering:** lektionshänvisningar valideras mot vad som faktiskt
  skickades till modellen, så de kan inte hallucineras. Lektionstitlar renderas server-side
  ur id:t.
- **Gränsvärden:** fråga max 6 000 tecken, kontext max 8 000. Strypning 6 per minut, 40 per
  dygn och användare, 300 globalt. Timeout 8 sekunder på routningen, 45 på svaret.
- **Faller stängt.** Saknas `ANTHROPIC_API_KEY`, `PILOT_SECRET` eller KV-bindningen `RL`
  svarar endpointen 501 i stället för att släppa igenom.
- **Förbud i systemprompten:** skriver inte pitchar, återger inte korpusen, avslöjar inte
  instruktionerna.

### 1.4 Åtkomst

- `/pilot` med magisk länk mot en **hårdkodad lista på två adresser**,
  `ludvig@vndy.se` och `sebastian@vndy.se`.
- Cookien `motparten_pilot` är HMAC-SHA256 över `mejl|utgång`, jämförs i konstant tid,
  giltig i 30 dagar.
- **Motparten och Delägaren delar ingen session.** Middlewaren skiljer på värdnamn:
  Supabase-JWT:n öppnar bara Marginalen, pilotcookien bara Motparten. Verifierat på det nya
  Pages-projektet 2026-08-30: `/motparten` och `/pilot` avvisas på aktiekursens värdnamn.

### 1.5 Grindar och verktyg

| Verktyg | Vad det gör | I `npm run check` |
| --- | --- | --- |
| `tools/check-motparten.mjs` | evidenspolicyn, färdighetstaxonomin, korpussynk, semantiska canaries | ja |
| `tools/motparten-rosttext.mjs` | plockar ut prosan till markdown för röstgranskning | nej |
| `tools/bygg-korpus.mjs` | bygger `_korpus.js` ur källan | nej, körs vid ändring |
| `tools/prova-routning.mjs` | routningseval mot deployad endpoint, 15 fall i tre kategorier | nej, kostar pengar |
| `tools/prova-coachen.mjs` | policyeval, 15 fall, mänsklig bedömning | nej, kostar pengar |

**Vad grinden faktiskt fäller:** A eller B utan källa, C med källa, källa som saknas i
registret, okänd färdighet, fras ur den röda listan utanför ett myt-steg, korpus ur synk
med källan, och fem semantiska canaries som fångar om utvinningen tappat visualtext,
evidensreservationer eller myt-märkning. Distraktorer ur quizalternativ får aldrig läcka in
i korpusen, det testas separat.

### 1.6 Motorn under

`src/lib/kurs.mjs` är enda stället som vet var en kurs bor: katalog, ordlista, varumärke,
navigation, korslänkar. Sidkropparna delas, rutterna är skal. Aktiekursen ska rendera
oförändrat efter varje ändring i motorn, vilket kontrolleras med `node tools/dist-hash.mjs`
som normaliserar bort Astros asset-namn och scope-id:n.

---

## 2. Kända luckor i det som finns

### 2.1 Ingen framstegsspårning alls

Det finns **ingen** lagring av vad en användare gjort, varken i webbläsaren eller på
servern. Ingen `localStorage`, inget serverside. Konsekvenserna:

- Ingen kan återuppta där de slutade.
- Kursöversikten kan inte visa vad som är avklarat.
- Quizgrinden på 80 procent gäller inom sessionen och nollställs vid omladdning.
- Det går inte att veta om någon faktiskt gått kursen, vilket också betyder att
  mätupplägget i säljverktygsspecen avsnitt 10 saknar sitt mest grundläggande mått.

Aktiekursens äldre textkurs har localStorage-progress. Fokus-spelaren, som Motparten kör,
har det inte. Det här är den största enskilda luckan i produkten som den ser ut idag.

### 2.2 Ingen betalväg och inga rättigheter

Motparten har ingen köpflöde alls. `functions/api/stripe-checkout.js` och
`stripe-webhook.js` finns i repot men hör till aktiekursen. Rättigheter per kurs, alltså
vem som får se vad, är inte byggt. Pilotinloggningen är den enda vägen in och den släpper
in exakt två hårdkodade adresser.

### 2.3 Coachen står frikopplad

Den är byggd men den vet ingenting om användaren: inte var i kursen personen är, inte vad
den frågat förut, inte något om deras affärer. Den är en chattruta bredvid kursen, vilket
är dess svagaste form. Se säljverktygsspecen avsnitt 5.

### 2.4 Kursen är text-tung, avsiktligt eller inte

25 visuals av 259 steg, och alla av samma typ. Aktiekursen använder sex visualtyper och har
en uttalad princip om variation och symmetrisk pacing. Motparten har i praktiken bara
`jamforelse`. Det kan vara rätt, säljinnehåll handlar mer om omdöme än om att läsa siffror,
men det är värt att avgöra medvetet snarare än att låta det bli så.

Ordlistan har sex termer. Marginalglosorna är alltså i praktiken oanvända.

### 2.5 Innehåll som inte är granskat

Sebastian har inte granskat de tolv "Sebastian tänker"-anekdoterna eller de tolv
principerna. De är skrivna i hans namn och publicerade på hans auktoritet.

---

## 3. Planerat, inte byggt

Detaljerna ligger i `docs/superpowers/specs/2026-08-30-saljverktyget-design.md`. Här bara
vad det är och i vilken ordning.

| Modul | Vad | Status |
| --- | --- | --- |
| Profil | vad du säljer, till vem, årsmål | ej byggd |
| Affärer | prospekt och pipeline, minimalt CRM | ej byggd |
| Veckan | vad du bör göra idag | ej byggd |
| Radar | hittar och bevakar marknaden | ej byggd |
| Coach | finns, men frikopplad | delvis |

**Byggordning** (säljverktygsspecen avsnitt 9): nästa aktivitet med datum, sedan
aktivitetshistorik med nej-orsaker, sedan diktering, sedan Veckan, sedan Radar som bevakad
marknad, sist förändringssignaler. Profilen in före Radar. Den dumma versionen av Veckan
faller ut nästan gratis ur första steget.

**Enskilt viktigast av det planerade:** röstanteckningen efter mötet. Den avgör om
datamotorn har något att äta, för ingen orkar skriva.

**Prismodellen** är beslutad men inte byggd: 5 990 kr engångs eller 599 kr/mån som leder
till ägande efter tolv månader, därefter 3 490 kr/år för tjänsterna, med 100 credits i
månaden till Radar.

---

## 4. Beslutat att inte bygga

Skrivet här för att det kommer att föreslås igen:

- **Pitchgenerering.** Kunden skriver utkastet, coachen granskar det.
- **Tonanalys och avläsning av kundens känsloläge.** Exakt det den röda listan underkänner.
- **Automatiska utskickssekvenser.**
- **Avtal, e-signering, order och fakturering.** Produkten gör offerter och följer dem, inte
  det som kommer efter.

---

## 5. Vad som blockerar lansering

I ordning:

1. **Framstegsspårning.** Utan den är det inte en kurs man går, det är sidor man läser.
2. **Betalväg och rättigheter.** Ingen kan köpa produkten idag.
3. **Pilotinloggningen ska bort.** Den är P0 i `LAUNCH.md`, och den är samtidigt enda vägen
   in, så den kan inte tas bort förrän punkt 2 finns.
4. **Sebastians granskning** av anekdoterna och principerna.
5. **Två beslut i `LAUNCH.md`:** korpusexfiltration och kunddata till Anthropic.

Punkt 1 och 2 är arbete. Punkt 3 till 5 är beslut och granskning, alltså snabbare men
beroende av andra än den som kodar.
