# Implementationsplan: från analysverktyg till portföljvaksamhet

Datum: 2026-07-11
Status: förslag (ej påbörjad)
Gäller: Delägaren, hela pipen (Maskinen, Hantverket, Ägarbrevet)

---

## 1. Mål och ärlig utgångspunkt

Målet är att flytta tjänsten från "trevligt analysverktyg" till något man känner
att man inte har råd att stänga av: en vaksamhet på ens egna innehav, på ens egna
villkor, med källa till varje påstående.

**Utgångsläget (ärligt):** vi har berättelsen, vokabulären och UI-skisserna för
det mesta, men nästan inget körande maskineri. Ägarbrevet, Avtalsliggaren,
Tillväxtläget, Beteendespåret är mock. Enda riktiga dataflödet är FI:s
insynsregister (`motor/upptack-json.mjs`, daglig cron). Fråga (`functions/api/fraga.js`,
Haiku) och Rapportkollen (Sonnet) finns som tunna endpoints. Innehav-tabellen
(`holdings`) är tom. Gapet mellan "vi har det" och "det funkar" ÄR produkten.

## 2. Bärande princip (allt hänger på denna)

> Vi stör dig bara när något **du själv** sa var viktigt har ändrats. Tystnaden
> är beviset på att allt är lugnt.

En loop, byggd end-to-end på ETT riktigt innehav först:

```
Import -> fånga tes + trådar (tripwires) -> hämta/läsa periodsiffror
       -> matcha mot trådarna -> Ägarbrevet larmar BARA vid korsning, med källa
```

Resten (insiders, kalender, filings/kallelser, den disciplinerade tvillingen,
kurskoppling) är påbyggnad på samma rygg.

## 2b. Det visuella målet: tes-tidslinjen (produktens kärna, north star)

Detta är inte ett sidospår. Det är den yta allt annat matar. Från och med Fas 2
byggs backend-datan så att den kan renderas direkt i tidslinjen, aldrig som en
eftertanke. Varje mäklare har en kurva; skillnaden är att **vår kurva minns
varför du köpte**. Den gör portföljen till en samling levande teser med minne,
och minnet är den brutala switching cost-effekten: ju längre man stannar, desto
rikare blir spegeln, desto dyrare att lämna.

Fem lager på en tidslinje per innehav:

1. **Händelse-annoterad kurva.** Prislinjen med markörer: trådkorsningar,
   insiderkluster, emissionsmandat, rapport-hit/miss, dina egna köp/sälj. Varje
   markör klickbar: faktum, källa, och lektionen som förklarar den.
2. **Tes-bandet.** Ett band längs tiden: tes intakt / glider / bruten, drivet av
   invarianterna. Visar det farliga: priset kan stiga medan tesen tyst brister
   (kapitel 24.2 gjord synlig). Divergensen kurva mot ditt skäl är insikten.
3. **Ditt beteende på kurvan.** Beslutsdagboken inritad. "Du sålde här, mot din
   egen håll-regel." Om dig, inte om marknaden. Ingen framtidsutsaga.
4. **Kontrafaktisken.** Skuggkurva: om du följt dina egna regler (trim-trappan,
   håll-regeln), var hade du stått? Beteendegapet visualiserat. Förnyelsedrivaren.
5. **Basräntor, hederligt.** Aggregat med urvalsstorlek och missarna synliga,
   ramat som odds (kapitel 10.3), aldrig enskild framåtblick.

**Hederlighetsprinciper (det som gör den premium, inte billig):** beskrivande
aldrig prediktivt; visa missarna (annars survivorship-teater); tes-relativt inte
pris-relativt. Dessa är designregler, inte API-frågor.

Moaten är strukturell: tjänsten vet *varför* du äger (tesen), *vad du sa var
viktigt* (trådarna) och *hur du betett dig* (dagboken). Det kan en mäklargraf
inte kopiera, för den minns inte dig.

## 3. Positioneringsvakter (låses INNAN copy skrivs)

Dessa är hårda regler, inte önskemål, av juridiska och tillitsskäl:

1. **Försäkring är metafor, aldrig löfte.** Aldrig "vi skyddar dina pengar /
   vaktar ditt kapital / garanterar". Alltid "vi säger till när något du sa var
   viktigt ändrats". Undvik ordet försäkring i produkttext där det kan läsas
   bokstavligt (rådgivnings-/FI-risk). Behåll "aldrig köp- eller säljråd,
   besluten är dina".
2. **Ingen låtsad precision.** Aldrig "slår i kassan om exakt 4,2 månader".
   Alltid intervall + källänk + "mekanism, inte prognos" (samma som
   sifferpolicyn i CLAUDE.md). "Kassan räcker ungefär 4 till 5 kvartal i
   nuvarande takt."
3. **Källa på varje tal.** Ingen siffra i ett larm utan klickbar referens till
   rapport/pressmeddelande + sida. Saknas källa: säg det, larma inte.

## 4. Gate: datakällebeslut (Fas 0, blockerar Fas 2 och framåt)

Den deterministiska motorn kräver två flöden vi inte äger:

- **Strukturerad fundamentaldata** (omsättning, marginaler, kassa, nettoskuld,
  guidance) för runway och trådmatchning.
- **Filings-text** (kallelser, pressmeddelanden) för utspädningsmandat och avtal.

Utvärderat men parkerat: Börsdata (Pro ca 25 EUR för bygge, Enterprise för
kommersiell licens/redistribution), FMP (profil funkar för .ST, quote/ratios/
historik premium), Finnhub (ingen Norden på testtier). Retail-tiers är
privat-bruk-only, alltså otillräckligt för en betaltjänst.

**Leverabel:** kort besluts-PM (Börsdata Pro vs Enterprise vs FMP): vad var och
en låser upp, kostnad, och vad kommersiell licens kräver. Beslutet är första
steget, inte sista. Filings/kallelser kan i MVP tas manuellt (klistra in en
rapport i Rapportkollen) tills en filings-feed är vald.

## 5. Arkitekturbeslut

- **Per-användardata i Supabase** (inte statisk JSON som `upptack-insyn.json`),
  eftersom allt är personligt och bakom auth. Läsning via RLS + edge-funktioner.
- **Beräkning i `motor/`-skript, körda av cron** (mönster: `.github/workflows/
  upptack-daily.yml`), som skriver resultat till Supabase med service-nyckeln.
- **Rendering läser färdigt resultat** (brief-rad per användare per dag), så
  klienten aldrig gör tung analys.
- **AI-roller oförändrade:** Sonnet till tung dokumentextraktion (Rapportkollen),
  Haiku till interaktivt Q&A (Fråga). Motorn (trådmatchning, runway) är
  deterministisk kod, inte LLM, av tillitsskäl.

## 6. Datamodell (skiss, ny migration)

Nya tabeller (utöver befintliga `holdings`, `decisions`, `invites`,
`subscriptions`). Alla RLS-skyddade på `user_id`.

```sql
-- Tesen: "försäkringsbrevet" per innehav
theses (
  id uuid pk, holding_id uuid fk, user_id uuid fk,
  why text,                       -- varför jag äger det
  invariants jsonb,               -- [{claim}] de saker som måste förbli sanna
  created_at, updated_at
)

-- Trådar (tripwires): de hårda parametrarna
tripwires (
  id uuid pk, holding_id uuid fk, user_id uuid fk,
  metric text,        -- gross_margin | revenue_growth | net_debt |
                      -- cash_runway_q | dilution_pct | valuation_pe |
                      -- insider_sell_kr | custom
  op text,            -- below | above | crosses
  value numeric, unit text, note text,
  status text default 'armed',    -- armed | tripped | muted
  created_at
)

-- Korsningar (när en tråd slår). TIDSLINJE-REDO: as_of + kind gör varje rad
-- till en ritbar markör; lesson_ids kopplar markören till kursen.
tripwire_events (
  id uuid pk, tripwire_id uuid fk, holding_id uuid, user_id uuid,
  kind text,          -- tripwire | insider | emission | report | decision
  as_of date,         -- datum markören sitter på kurvan (skilt från triggered_at)
  observed_value numeric, threshold numeric, source_type text, -- report|filing|insider
  source_ref jsonb,   -- {url, page, title}
  lesson_ids text[],  -- från lektionskartan (händelse -> lektion)
  triggered_at, acknowledged_at
)

-- Strukturerade periodsiffror (från datakälla eller Rapportkollen)
holding_figures (
  id uuid pk, holding_id uuid, period text,   -- t.ex. 2025Q3
  as_of date,         -- perioden som datum, för tes-bandet över tiden
  metric text, value numeric, unit text,
  source_ref jsonb, ingested_at
)

-- Prisserie per innehav (tidslinjens x/y-axel). Dagsslut räcker för annotering;
-- ingen realtid. Fylls av datakällan; slotten finns från Fas 2 även om den är gles.
prices (
  id uuid pk, holding_id uuid, d date, close numeric,
  source text, unique (holding_id, d)
)

-- Genererat morgonbrev per användare per dag
briefs (
  id uuid pk, user_id uuid, date date,
  status text,        -- silent | alerts
  payload jsonb,      -- larm, i risk-först-ordning
  checked jsonb,      -- {reports:N, filings:M, insiders:K} (kvittologgen)
  created_at
)
```

Utökning av befintlig `decisions` (beslutsdagboken): `rule_ref uuid` (vilken
tråd/tes den hänger på) + `as_of date`, så besluten blir markörer på tidslinjen
(lager 3, spegeln) och matar den disciplinerade tvillingen.

**Tidslinjens läsmodell:** en assembler (ren funktion, mönster som `brief-build`)
slår ihop `prices` (kurvan) + `tripwire_events`/`decisions` (markörer, via
`as_of`) + `holding_figures` mot `theses.invariants` (tes-bandet: intakt/glider/
bruten per period) till en färdig tidslinje-nyttolast per innehav. Rendering
ritar bara, räknar aldrig. Assemblern kan skrivas och testas offline på inmatade
`prices`, precis som brief-build, långt innan en prisfeed finns.

## 7. Pipeline (motor + endpoints)

Nya skript i `motor/` (Windows-säkra, `pathToFileURL`-guard som resten):

- `ingest-figures.mjs` : hämtar periodsiffror per innehav från vald datakälla ->
  `holding_figures`.
- `rapportkollen-extract.mjs` : en rapport (PDF/text) -> strukturerade,
  källänkade siffror via Sonnet -> `holding_figures`. (Bygger på befintlig
  Rapportkollen.)
- `tripwire-eval.mjs` : för varje `armed` tråd, jämför senaste `holding_figures`
  mot tröskeln -> skapar `tripwire_events` vid korsning.
- `brief-build.mjs` : per användare, samla dagens `tripwire_events` + relevanta
  insiders + kalender -> `briefs.payload` i risk-först-ordning. Inga events ->
  `status='silent'` + kvittolog.
- `timeline-build.mjs` : läsmodellen för tes-tidslinjen (north star, avsnitt 2b).
  Ren funktion: `prices` + markörer (`tripwire_events`/`decisions` via `as_of`)
  + tes-band (`holding_figures` mot `theses.invariants`) -> tidslinje-nyttolast
  per innehav. Testbar offline på inmatade `prices`, som `brief-build`.
- Utöka `upptack-json.mjs` -> koppla insynsposter till användarens `holdings`
  (inte bara momentum), och skriv dem som markörer (`kind='insider'`).

Nya endpoints i `functions/api/`:

- `brief.js` : verifierar session (som `_middleware.js`), returnerar användarens
  senaste `briefs`-rad.
- `timeline.js` : returnerar tidslinje-nyttolasten för ett innehav (kurva +
  markörer + tes-band).
- `thesis.js` : CRUD för tes + trådar (RLS-skyddat).

Cron: ny `.github/workflows/vigilans-daily.yml` (mönster från upptack-daily):
`ingest -> extract -> eval -> brief-build`, nattligt. Kräver
`SUPABASE_SECRET_KEY` som secret (finns lokalt i `.env`, måste sättas i GH).

## 8. Faser

### Fas 0 - Beslut och grund (ingen kod på motorn än)
- Datakälle-PM + beslut (blockerare, se avsnitt 4).
- Lås positioneringsvakterna (avsnitt 3) som copy-regler.
- Migration för tabellerna i avsnitt 6 (kan göras parallellt, ofarligt).
- **Bevis:** vi vet vad vi bygger på och vad det får kosta.

### Fas 1 - Tes och trådar (fånga försäkringsbrevet)
- Vid import/lägg-till-bolag: fånga `why` + 3 invarianter + trådar. UI i
  `dina-bolag` / `lagg-till-bolag` / `importera`.
- `thesis.js`-endpoint, RLS.
- **Bevis:** en användare kan tala om varför hen äger X och vad som får ändra det.
- Effort: M. Beroende: migration.

### Fas 2 - Vaksamhetsloopen MVP, tidslinje-redo (tunn vertikal skiva)
Målbilden för Fas 2 är tes-tidslinjen (avsnitt 2b), inte bara ett brev. Datan
byggs så att den matar tidslinjen DIREKT, aldrig som eftertanke.
- EN metrik, ETT innehav: bruttomarginal ur EN riktig rapport via
  `rapportkollen-extract` -> `holding_figures` (med `as_of`) -> `tripwire-eval`
  -> `tripwire_events` (med `kind`, `as_of`, `lesson_ids`) -> `briefs`.
- Prisserie (`prices`) för samma innehav, glest men äkta (dagsslut räcker).
- `timeline-build.mjs` slår ihop kurva + markören + tes-bandet -> nyttolast.
- Två renderingar av SAMMA nyttolast: Ägarbrevet (korsningen, risk-först, källa)
  OCH en första tidslinje-vy som visar markören på kurvan med tes-bandet.
- Tyst morgon om ingen korsning ("Vi skannade allt, inga förändringar").
- **Bevis:** en riktig trådkorsning syns både som brev OCH som en klickbar markör
  på innehavets kurva, med källa och lektionspekare. Ägarbrevet är äkta, inte
  Telvio-mock. Tidslinjen, produktens kärna, existerar från första skivan.
- Effort: L. Beroende: Fas 0-beslut (figures + prices); i MVP kan båda matas
  manuellt (rapport-inklistring + inklistrad prisserie), loopen och tidslinjen
  kan alltså demas offline innan datakällan är vald.

### Fas 3 - Händelseflöden (bredda vad som bevakas)
- Insiders kopplat till innehav (utöka `upptack-json`): "en insider i ett bolag
  du äger köpte X".
- Personlig kalender: rapportdatum, stämmor, ex-dagar för dina bolag.
- Runway/utspädningsklocka för olönsamma innehav (intervall, inte decimal).
- Kallelse/filings-vakt (utspädningsmandat, närståendetransaktioner): kräver
  filings-feed eller manuell inmatning.
- Varje nytt flöde skrivs som en markörtyp på tidslinjen (`kind`): insider,
  emission, rapport. Bygger lager 1 (den annoterade kurvan) tätare.
- **Bevis:** brevet OCH kurvan fångar det en fundamental ägare faktiskt bryr sig
  om, som klickbara markörer.
- Effort: L. Beroende: Fas 2 + ev. filings-källa.

### Fas 4 - Beteendelagret (den disciplinerade tvillingen, retention)
- Beslutsdagboken som ryggrad: varje köp/sälj/håll loggas med skäl + regel
  (`decisions` + `rule_ref`).
- Friktion före affär: tvillingen ställer dina egna checklistefrågor (Verktyg)
  och visar ditt mönster (t.ex. säljer vinnare tidigt).
- Bygg "Säkra eller stretcha" (spec finns:
  `docs/specs/verktyg-sakra-eller-stretcha.md`).
- Kvartalsvis ånger-spegel: ditt beteendegap mot en disciplinerad baslinje.
- Detta ÄR tidslinjens lager 3 och 4 (dina beslut på kurvan + kontrafaktisken).
  Beslutsmarkörer (`decisions.as_of`) och skuggkurvan ritas på samma yta.
- **Bevis:** produkten bevisar kursens värde med användarens egna pengar, visuellt,
  på innehavets egen kurva. Den starkaste förnyelsekroken.
- Effort: L. Beroende: `decisions` i bruk + tidslinjen (Fas 2).

### Fas 5 - Kurs-loopen (Hantverket gifter sig med Maskinen)
- Lektion i rätt ögonblick: när en utspädnings-tråd larmar, visa kapitel 17
  (kallelser) inline.
- Interaktiva checklistor per innehav: Verktyget förifyllt efter relevant kapitel.
- Post-mortem-case: mall + snabb process för att handbygga ett färskt case
  (backa bandet, visa tecknen 6 mån innan). Ej auto-magiskt, men snabbt.
- **Bevis:** kursen blir arbetsverktyg, inte passiv video.
- Effort: M. Beroende: Fas 2 (trådar att haka lektioner på).

### Fas 6 - Retention och paketering
- Årlig portföljhälsorapport: vad vi fångade, ditt beteendegap, tes-scorecard.
- Koppla till `subscriptions` (Stripe-stubben finns) + invite-mekaniken (2/medlem).
- **Bevis:** en förnyelsedrivande artefakt folk faktiskt vill ha.
- Effort: M. Beroende: Fas 4 (beteendedata).

## 9. Tvärgående (byggs in från start, inte efteråt)

- **Kvittologgen** ("Vad vi kollade i natt") i `briefs.checked`, även lugna dagar.
- **Källänkning** universell (source_ref överallt).
- **Ärlig täckning:** UI som säger vad som bevakas och inte (fundamenta + filings,
  inte realtidskurs).

### 9.1 Den dubbelriktade kurskopplingen (bärande tråd, inte en fas)

Kursen ska vara kopplad åt BÅDA hållen, och det är det som gör hantverket levande
snarare än en video man tittar klart på:

- **Händelse -> lektion.** När en tråd larmar på ett innehav pekar brevet/vyn på
  exakt den lektion som förklarar mekaniken. Utspädningsmandat -> kapitel 17
  (kallelser/utspädning). Marginal under golv -> lektionen om lönsamhet. Man lär
  sig i det ögonblick det känns i den egna plånboken.
- **Lektion -> innehav.** När man läst ett kapitel dyker en handling upp på ett
  RIKTIGT innehav: kör moat-checklistan på X, värdera Y, sätt en tråd på Z
  utifrån det du nyss lärde dig. Verktyget förifyllt med bolaget.

Konkret koppling i data: en lätt mappning `metric/händelsetyp -> lektions-id`
(t.ex. `dilution -> 17.x`, `gross_margin -> kap 4`), och omvänt `lektions-id ->
föreslagen handling` (checklista, tråd-mall). Mappningen är liten och statisk,
men den syr ihop Hantverket och Maskinen till en slinga: verkligheten skickar dig
till lektionen, lektionen skickar dig tillbaka till dina bolag. Byggs stegvis
(en handfull kopplingar räcker för att bevisa mönstret), men designas in redan i
Fas 2 så trådar och lektioner delar id-rymd från början.

## 10. Definition av klar för MVP (Fas 2)

En riktig användare med ETT importerat innehav och en satt marginaltråd får, dagen
efter att en rapport publicerats som korsar tröskeln, ett Ägarbrev som leder med
den korsningen, med klickbar källa, och en tyst morgon annars. **Och samma
korsning syns som en klickbar markör på innehavets kurva (tes-tidslinjen, avsnitt
2b), med tes-bandet och lektionspekaren.** Ingen mock i den kedjan. Tidslinjen är
inte ett senare tillägg: den är målbilden Fas 2 byggs mot, och backend-datan
(`prices`, `holding_figures.as_of`, `tripwire_events.kind/as_of/lesson_ids`) matar
den direkt.

## 11. Öppna beslut

1. Datakälla (Fas 0, blockerare).
2. Filings/kallelse-feed: köpt källa eller manuell inmatning i början?
3. Push-notiser (dödmansgrepp): e-post räcker i MVP, push senare? Kräver infra.
4. Ljudutgåvan av brevet (TTS): egen fas, ej i kritiska loopen.

## 12. Risker

- **Licens/juridik:** kommersiell datalicens krävs innan lansering (se LAUNCH.md).
  Retail-tier räcker inte.
- **Tillit rasar på fel siffra:** därför deterministisk motor + källa + intervall,
  aldrig LLM-gissade tal i larm.
- **Scope:** frestelsen att bygga brett. Den tunna skivan (Fas 2, en metrik, ett
  innehav) måste bevisas före breddning.
- **Testbakdörren `functions/api/devlink.js`** måste bort före publik lansering
  (redan spårat i LAUNCH.md).
