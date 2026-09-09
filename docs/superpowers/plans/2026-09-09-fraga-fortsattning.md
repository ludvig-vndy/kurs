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
- [ ] Utöka _nyckeltal.js med tester i nyckeltal-perioder.test.mjs för lokala
  rubriker och flera perioder; verifiera register och summa i integrationstest.
- [ ] Oberoende granskning av periodsäkerhet och konflikter.

### Task 2: Minneskärna och klient
- [ ] Ny _trad.js: lasTrad(token, uid, secret, nu?), skrivTrad(turer, uid, secret, nu?),
  skapaTur(fraga, råblock, register, routing, nu?), samtalsText(turer),
  routingUrTrad(fraga, holdings, turer). Ogiltig token returnerar tom lista.
- [ ] _faktaregister.js: importeraTidigare(poster) returnerar Map gamla -> nya id,
  transaktion per komplett graf. Skriv om indata och vilar_pa, markera tidigare.
- [ ] Båda klientytorna: trad och djup i request, spara returnerad trad efter
  godkänt svar, nollställ vid Börja om. Separera användare.
- [ ] Tester för signatur, uid, TTL, kapning, referensgraf, klientlagring.

### Task 3: Serverintegration och djupgranskning
- [ ] fraga.js verifierar minne efter auth, omregistrerar före nytt underlag,
  använder explicit routing före minne, förmedlar historik som data till båda
  modeller, signerar enbart godkända svar.
- [ ] Ny _utredning.js äger budget och undersökningsplan; planera och sökning
  registrerar framsteg utan att modelltext visas som verifierad slutsats.
- [ ] Testa requestbudget, parallella tool_use, deadline, fallback, nya perioder,
  tidigare bolag, angriparändrad tråd och obesvarad delfråga.
- [ ] Riktade tester, npm run check, bygge, oberoende slutgranskning, skarpa prov.

## Beslut och framsteg

- Användarens kör vidare omfattar samtliga tre steg; inga nya godkännanden behövs
  för reversibla implementationer på befintlig testgren.
- Uppdelat filägande: extraktion, minneskärna/register, klientytor och
  serverintegration. Planen används som arbetsjournal under genomförandet.
