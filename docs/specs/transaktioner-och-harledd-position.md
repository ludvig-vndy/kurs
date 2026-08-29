# Spec: transaktioner och härledd position

*2026-08-29. Skiss för köp/sälj-historik per innehav, kursgraf med markörer, och automatiskt uträknad GAV. Utgår från befintligt schema i `supabase/migrations/20260710000000_init.sql`.*

## Kärninsikt

Ingen ny tabell behövs. `decisions` modellerar redan affärer:

```
decisions(id, user_id, holding_id, kind, reason, quantity, price, decided_at, created_at)
decision_kind = enum ('kop','salj','folj')
```

En köp/sälj-affär är en `decisions`-rad med `kind = 'kop' | 'salj'`, `decided_at` = affärsdatum, `quantity`, `price`. Fältet `reason` (skälet i stunden) är beslutsdagbokens själva poäng och det som skiljer oss från en ren depåvy: inte bara *att* du köpte, utan *varför*.

## Rollfördelning

- **`decisions` = huvudbok (affärer) plus skäl.** Sanningskällan för historiken. Varje kop/salj är en oföränderlig rad. Det är också vallgraven (beslutsdagboken): reason knyter affären till tesen och till kursen.
- **`holdings` = identitet plus härledd position.** `name, ticker, isin, relation` är innehavets identitet. `quantity` och `gav` blir **härledda** ur affärerna, inte längre något användaren skriver in för hand. De behålls som kolumner (cache) så befintliga läsare (`functions/api/fraga.js`, `dina-bolag.html`) fungerar oförändrat.

## Uträkning (snittkostnadsmetoden)

Position ur ett innehavs kop/salj-rader, sorterade på `decided_at`:

```
qty = 0, cost = 0
kop:  qty += q ; cost += q*p
salj: avg = cost/qty ; qty -= q ; cost -= q*avg   // sälj sänker inte snittet
gav = cost/qty ; quantity = qty
```

Detta är exakt `position()` i mock-detaljsidan (`public/labs/mock-bolag-detalj.html`). Sälj påverkar inte GAV, bara antalet, vilket är korrekt snittkostnadsmetod och det Avanza visar.

## Var uträkningen körs

Rekommendation: **DB-trigger.** En SQL-funktion `recalc_holding(holding_id)` som räknar om `holdings.quantity` och `holdings.gav` ur innehavets kop/salj-rader, körd av en trigger på `decisions` (insert/update/delete). Fördel: en sanningskälla server-side, alla befintliga läsare rör inte sin kod, och positionen kan aldrig hamna i otakt med historiken.

Alternativ (app-side, summera vid läsning) väljs bort: då måste varje läsare bära logiken och cachen försvinner.

## Manuell snabbinmatning kontra huvudbok

De ska samexistera utan krock:

- **Snabb (dagens onboarding):** lägg till ett innehav med antal och GAV direkt på `holdings`, inga affärer. Låg tröskel, precis som nu.
- **Huvudbok:** lägg in enskilda köp och sälj (bolagssidan "Lägg till affär"). Så fort en kop/salj-rad finns för ett innehav blir **huvudboken auktoritativ**: `recalc` skriver över quantity och gav ur affärerna, och den manuellt inmatade GAV:n ignoreras.

Regel: finns affärer, härled; annars använd den manuella positionen. En liten flagga (`holdings.position_kalla = 'manuell' | 'huvudbok'`, eller helt enkelt `count(kop/salj) > 0`) styr vilket.

## Vad det låser upp

- **Affärshistorik och markörer** på kursgrafen (ur `decisions`, gröna köp, röda sälj).
- **Automatisk GAV:** användaren behöver aldrig kunna sin snittkurs, den räknas ut. Löser tröskelproblemet bättre än att skriva in GAV.
- **Beslutsdagboken/skälet:** ett sälj i panik med sitt reason blir granskbart i efterhand, mot tesen och mot girighets-lektionerna. Det ingen marknadsbred tjänst kan göra.

## Kvarstår separat: kurshistorik för själva linjen

Markörerna kommer ur affärerna och kan bli riktiga direkt. Men kurs**linjen** bakom dem kräver kurshistorik, samma lucka som sparklines: `companies.json` har bara dagens snapshot. Billigaste vägen: låt nattjobbet spara dagskursen per bolag till en historikfil, så byggs serien upp. Markörer och GAV-linje kan visas mot en gles eller snapshot-byggd linje tills historiken fyllts.

## Migration (liten)

1. `decisions` finns redan. Lägg index på `(holding_id, decided_at)`.
2. SQL-funktion `recalc_holding(uuid)` (snittkostnad ovan) + trigger på `decisions` efter insert/update/delete.
3. Valfritt: `holdings.position_kalla` för manuell-mot-huvudbok, eller härled ur affärsantalet.
4. RLS: `decisions` har redan "egna beslut". Inget nytt.

Ingen datamigrering av befintliga innehav behövs: de förblir manuella positioner tills användaren lägger in affärer.
