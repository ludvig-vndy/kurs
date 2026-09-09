# Relationer, premisser och redigering Implementation Plan

**Goal:** Genomföra de tre förbättringar användaren godkänt: beräknade relationer,
granskning av outtalade antaganden och kortning före slutgranskning.
**Spec:** ../../fraga-analys-forbattringar-2026-09-09.md
**Architecture:** Utöka befintligt beräkningsverktyg med utveckling, serverrenderade
utsagor och samma proveniens. En separat redigerare får föreslå kortare prosa
men får inte ändra faktaposter eller stödreferenser; slutgranskaren ser
original och slutversion för att kontrollera betydelse och reservationer.
**Tech Stack:** Befintliga JavaScript Pages Functions, node:test och API-proven.

- [x] Beräkning: positiv, jämförbar periodserie; exakta par och omfattning;
  kontroll av fördubbling/halvering och procentuell acceleration utan avrundade
  beslut. Bevara bolag, mått, enhet, period, proveniens och beroendegraf.
- [x] Prosa: kända uttryck för kvantifierade relationer får inte skrivas som
  fria bolagspåståenden. Modellen använder utvecklingsposten. Dokumentera
  att lexikal upptäckt inte bevisar all möjlig naturlig språksemantik.
- [x] Premisser: granskaren skiljer givna uppgifter, villkor och härledda
  slutsatser. Positiva/negativa kontrollpar för utdelning, kapitalkostnad,
  skalfördelar och frånvaro av belägg.
- [x] Redigering: högst ett budgeterat försök, före slutgranskaren. Samma
  postblock och referenser. Ingen publicering av ogranskad redigering.
  Vid ogiltigt eller misslyckat förslag granskas originalet.
- [ ] Regressioner: fel serie 10/20/30/40, korrekt 10/20/40/80, negationer,
  blandade bolag, periodluckor, antagandens ursprung, ändrade/kortade block,
  redigerartimeout och slutgranskaravslag. Skarpa frågor och kontrollpar.

Ändringarna görs på befintlig testgren. Ingen produktionsdeploy i denna uppgift.
