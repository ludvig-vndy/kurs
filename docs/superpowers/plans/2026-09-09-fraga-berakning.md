# Berakning pa begaran och ett aktivt bollplank

Spec: ../specs/2026-09-09-fraga-berakning.md. Godkand i samtalet.

## Omfattning

Forsta operationerna: summa, differens, tillvaxt, andel, per_manad.
Produkt och generell kvot vantar. Samtalsminne ar en separat kommande etapp.
Botens roll ar kallsatt analysstod: utveckla bade positiva och negativa
tolkningar nar underlaget motiverar det, visa osakerhet och gor bestallda
berakningar direkt. Inga koprad, garantier eller obelagda bolagspastaenden.

## Task 1: Berakningskarna och register

Implementera fullstandigt jamforbarhetskontrakt som delas med harled,
kanoniska varden (normaliserat), period/slag, berakningar med referenser,
proveniens fran lovposter, antaganden, djup och registerbudget.
API: register.laggBeraknad({operation, indata:[id]}) returnerar
{ok:true,id} eller {ok:false,skal}. Inga modellskrivna tal eller metadata.
Testa fel bolag/matt/slag/period, noll, icke andligt, kedjor och harled-poster.

## Task 2: Verktyg, svar och ytor

Koppla berakna till befintlig verktygsloop utan att forbruka gravvarv.
Sex berakningsforsok; totalt hogst tio modellanrop inklusive granskning och
fallback. Reservera utrymme for slutligt svar och ett mekaniskt omforsok.
Visa kedjeformler, kallor och antaganden. Uppdatera roll och svarskontrakt.
Granska aven svar med enbart beraknade poster for meningsfullhet.
Testa hamtning sedan berakning, budget, kedjning, avslag och rendering.

## Task 3: Kvalitet och verifiering

Skilj sakerhet fran svarsfomaga i skarpa prov. Lagg till marginal och
kvartalssummering, samt krav pa faktiskt svar nar fragan kan besvaras.
Kor berorda tester, projektkontroller och bygge. Oberoende slutgranskning.
Skarpa prov endast om nyckeln finns; redovisa annars begransningen.

## Beslut och framsteg

- Arbetskatalogen var ren vid start (a759985). Git worktree blockerades av
  filsystemets skrivskydd; arbetar pa plats enligt skillens fallback.
- Task 1 och 2 delar endast register-API ovan; filagande separerat.
- Normaliserat behalls som kanoniskt falt for kompatibilitet.
- Presentation rundar, berakningar bevarar full tillganglig precision.
- Task 2: implementerad. Separata hamt-/berakningsbudgetar, gemensamt tak pa
  modellanrop, aktiva analysinstruktioner, serverrenderad proveniens och
  granskning aven av ensamma beraknade poster.
- Oberoende granskning av Task 2 hittade tva luckor i prov/metadata, rattade:
  syntetiska marginalprovet kravde inte ratt period; berakningsstatus sattes
  aven for rena metodsvar.
- Task 3: skarpa prov utokade med fiktivt bolag och kontrollerbara berakningar.
  API-nyckel saknas i process och .env; inga skarpa modellprov korda lokalt.
- Bygge: 278 sidor. Projektkontroller grona. Delad rendering provad i Chromium.
- Slutgranskning fann tidigare mellanavrundning i enhetskonvertering och
  kassans rackvidd. Ruling: rattas i ursprungsberakningen, eftersom det nya
  kanoniska kontraktet annars ger ett annat tal an det anvandaren ser.
- Task 1: klar. Precision, periodetiketter, arvt ursprung och antaganden
  verifierade; presentationsformatering ar skild fran kanoniska operander.
- Slutlig oberoende omgranskning: tidigare fynd losta, 56 riktade tester grona,
  inga kvarvarande kritiska fynd i granskat omrade.
- Slutverifiering: 201 berorda tester grona. Hela sviten 500 tester,
  498 grona och samma tva tidigare prospekt_arbete/user_id-schemafel.
  npm run check och git diff --check grona. Bygge 278 sidor, Chromium-smoke gron.
- Task 3: lokal verifiering klar; skarpa modellprov aterstar eftersom lokal
  API-nyckel saknas. Andringarna ar inte deployade eller committade.
