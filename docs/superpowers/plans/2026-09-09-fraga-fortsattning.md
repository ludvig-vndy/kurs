# Fråga fortsättning Implementation Plan

> **For agentic workers:** Use superpowers:subagent-driven-development to implement this plan task-by-task.

**Goal:** Beräkningsbara rapporter, säkra följdfrågor och avgränsad djupgranskning.
**Architecture:** Deterministisk extraktion, signerad klientburen tråd och gemensamt budgeterad verktygsloop.
**Tech Stack:** JavaScript, Cloudflare Pages Functions, node:test, befintlig Anthropic-anslutning.
**Spec:** ../specs/2026-09-09-fraga-fortsattning.md

## Global Constraints

Inga modellskrivna värden blir fakta. Bevara ursprung och alla beräkningsberoenden.
Serverhemligheter lämnar aldrig servern. Ingen produktionsdeploy.

### Task 1: Extraktion
- [x] Utöka _nyckeltal.js med tester i nyckeltal-perioder.test.mjs för lokala
  rubriker och flera perioder; verifiera register och summa i integrationstest.
- [x] Oberoende granskning av periodsäkerhet och konflikter.

### Task 2: Minneskärna och klient
- [x] Ny _trad.js: lasTrad(token, uid, secret, nu?), skrivTrad(turer, uid, secret, nu?),
  skapaTur(fraga, råblock, register, routing, nu?), samtalsText(turer),
  routingUrTrad(fraga, holdings, turer). Ogiltig token returnerar tom lista.
- [x] _faktaregister.js: importeraTidigare(poster) returnerar Map gamla -> nya id,
  transaktion per komplett graf. Skriv om indata och vilar_pa, markera tidigare.
- [x] Båda klientytorna: trad och djup i request, spara returnerad trad efter
  godkänt svar, nollställ vid Börja om. Separera användare.
- [x] Tester för signatur, uid, TTL, kapning, referensgraf, klientlagring.

### Task 3: Serverintegration och djupgranskning
- [x] fraga.js verifierar minne efter auth, omregistrerar före nytt underlag,
  använder explicit routing före minne, förmedlar historik som data till båda
  modeller, signerar enbart godkända svar.
- [x] Ny _utredning.js äger budget och undersökningsplan; planera och sökning
  registrerar framsteg utan att modelltext visas som verifierad slutsats.
- [x] Testa requestbudget, parallella tool_use, deadline, fallback, nya perioder,
  tidigare bolag, angriparändrad tråd och obesvarad delfråga.
- [x] Riktade tester, npm run check, bygge, oberoende slutgranskning, skarpa prov.

## Beslut och framsteg

- Användarens kör vidare omfattar samtliga tre steg; inga nya godkännanden behövs
  för reversibla implementationer på befintlig testgren.
- Uppdelat filägande: extraktion, minneskärna/register, klientytor och
  serverintegration. Planen används som arbetsjournal under genomförandet.
- Implementerat i 253e623 på fraga-berakning-prov. Oberoende granskning hittade
  fel i narrativa periodomnämnanden, halvårsrubriker, PDF-konflikter, okända
  bolagsnamn i följdfrågor, hela verktygets timeout och första auth-händelsens
  kapplöpning mot sessionsläsning. Samtliga reproducerade och rättade med prov.
- 243 riktade tester gröna, inklusive Chromium på båda ytorna. Projektkontroller
  och bygge (278 sidor) gröna. Fulla sviten hade endast nätverksblockerade
  databastester; separat körning med nätverk bekräftade de två tidigare
  prospekt_arbete/user_id-schemafelen, inte nya chattfel.
- Användarens tillägg om svammel: instruktioner om svar först, relevanta belägg,
  korta förklaringar och ingen rutinmässig upprepning eller erbjudande att göra
  redan beställt arbete. Svarslängd prövas separat från sanningsgranskningen.
- Skarpa prov kräver nu faktisk kalenderårssummering, beräkning i följdfråga
  och en avgränsad djupgranskning. Fyra separata granskarprov skiljer giltiga
  observationer och villkorade förklaringar från obelagda orsaker och felaktig
  acceleration. Ett avklippt eller ogiltigt granskarbesked räknas aldrig som
  ett godkänt säkerhetsprov.
- 3993996: verkliga publiceringstider och upprepade rubriker hanteras; samtliga
  kvartal ur den hämtade historiken blir operander. Skarp kalenderårssumma och
  månadstakt i följdfrågan lyckades i körning 34332712231.
- e8bf747 och 54735ca: tolkningar/beräkningar granskas med analysmodellen,
  metodsvar fortsatt med den snabba. Tokenutrymme 2048 och medium effort för
  analysgranskaren, inom samma tids-/anropsbudget. API:s strukturerade JSON
  ersätter assistant-prefill för Sonnet 5. Leverantörens schemaformat tillåter
  inte syskonfält till anyOf; korrigerat i eccf08e efter konkret HTTP 400.
- Senaste fulla lokala körning: 544 tester, 542 gröna, endast de två kända
  databasfelen. Bygge 278 sidor. Efter den sista schemajusteringen: 24 berörda
  tester gröna. Oberoende granskning godkände kontrollflödet.
- Formler och enhetsomräkningar är infällbara i ytan; resultat, antaganden och
  ursprung visas direkt. Chromium-prov täcker både synlighet och escaping.
- Skarp körning 34334277250 på eccf08e: 8/8 svar klarade provkraven utan
  blockering, och 4/4 kontrollerade granskarfall gav rätt beslut. Loggens
  svar har lästs, inte enbart workflow-statusen. Kalenderårssumman hade 34 ord
  förklaring, följdfrågan 45 och djupgranskningen 229. API-kontraktet fungerar.
- Kvarvarande begränsningar: djupsvaret upprepade en underlagsreservation och
  antydde att säsongsmönster kunde uteslutas trots att jämförelseår saknades.
  De gröna proven täcker alltså inte all semantik eller upprepning. Den strama
  prosagrinden kan fortfarande felblockera räknade tidslängder; reparationsvarvet
  minskar konsekvensen men eliminerar inte problemet. Djupsvaret tog 82 sekunder.
- Ingen produktionsdeploy eller merge utförd. Ändringarna ligger på testgrenen.
