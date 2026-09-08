# Fraga dataposter Implementation Plan

> Inline execution enligt anvandarens kor-pa-instruktion. TDD per del.

**Goal:** Ersatt tal-tillatelselistan i Fraga med verifierade referensblock.
**Architecture:** Ett register per request bygger poster fran kodens extraktion
och kallutdrag. En separat parser kontrollerar modellens JSON och renderar
fakta. Fri prosa granskas separat innan svaret returneras.
**Tech Stack:** JavaScript, Cloudflare Pages Functions, node:test, statisk HTML.
**Spec:** docs/superpowers/specs/2026-09-08-fraga-dataposter.md

## Global Constraints

Inga nya beroenden. Inga finansiella faktatal fran modellen. Inga tankstreck i
genererad prosa. Requestlokalt register, inga delade anvandardata.

## Uppgifter

- [x] 1. Proveniens i `_nyckeltal.js`: bevara bolags-id, originalvarde/enhet,
  kallcitat/lage och faktainput i harledningar. Testa tva bolag och kallkedjan.
- [x] 2. `_faktaregister.js`: append-only register med `synka`, `prompt`, `get`.
  Separata ursprung och stabila id:n inom ett svar. Testa historik och kollisioner.
- [x] 3. `_faktasvar.js`: strikt JSON-schema, referensvalidering, numerisk
  prosagrind och serverrendering. Testa fel bolag/matt/period/enhet/tecken,
  fragetal, utskrivna belopp, okanda referenser och illustrationer.
- [x] 4. `fraga.js`: nytt promptkontrakt, register i varje verktygsresultat,
  separat semantisk granskning med fail-closed, samma kontroll utan dokument
  och efter fallback. Endpointtester stubbar bara externa anrop.
- [x] 5. Gemensam rendering i de tva HTML-ytorna. Visa ursprung, citat och
  tackning. Testa escaping och klickbara kallor med lokala fixturer.
- [x] 6. Anpassa befintliga endpointfixturer till JSON-kontraktet, kor relevanta
  tester, full testsuite, innehallsgrindar och bygge. Dokumentera baslinjefel.

Varje del: skriv beteendetest, kor och se vantat fel, implementera, kor igen.
Behall gamla kallgrindens rena tester: funktionen finns kvar for andra konsumenter
men far inte langre auktorisera svar fran Fraga.

## Verifiering och leverans

- 60 nya regressionstester. Alla passerar.
- Full testsvit: 444 tester, 442 passerar, 2 fallerar i den befintliga
  testdatabasen eftersom prospekt_arbete saknar user_id. Samma tva fel som
  fore andringen nar databasen kan nas. Ingen databasstruktur har andrats.
- npm run check: gront. npm run build: gront, 278 sidor.
- Bada fragaytorna provade i Chromium med lokala API-fixturer: inmatning,
  faktablock, utfallda citat och tackning. Inga JavaScript-fel.
- Oberoende kodgranskning: fynd atgardade och omprovade. Registret har ett
  byte-tak, reserverat utrymme for kallor/egna uppgifter och skickar deltan.
- Riktigt modellanrop har inte provats: ANTHROPIC_API_KEY saknas lokalt.
  tools/prova-fraga.mjs ar uppdaterat sa blockering alltid ar ett provfel
  och granskarens svar inte forvaxlas med svarmodellens ratext.
- Inga commits eller deployer gjorda. Andringarna ligger i arbetskatalogen.
