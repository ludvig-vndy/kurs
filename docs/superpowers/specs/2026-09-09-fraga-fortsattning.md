# Fråga: beräkningsunderlag, samtalsminne och djupgranskning

Användaren har godkänt genomförandet av steg 1–3 i samtalet. Detta preciserar
genomförandet tillsammans med den befintliga samtalsminnesspecen.

## 1. Rapporter till beräkningsposter

Utöka den deterministiska extraktionen så varje måttträff får närmaste giltiga
periodrubrik. Läs flera periodavsnitt i samma rapport. Explicit lokal men
ogiltig/oklar period får aldrig falla tillbaka på dokumentets rubrik. Bevara
bolag, mått, tecken, skala och exakt källställe. Jämförelsetal i parentes är
inte nya operander. Motsägande uppgifter ska inte godtyckligt väljas.
Testa brutna/förlängda räkenskapsår, publiceringsdatum och fyra kvartal som
summerats i beräkningsverktyget efter hämtning. Ingen modellbaserad gissning
av metadata, och ingen ny extern datakälla.

## 2. Samtalsminne

Följ 2026-09-08-fraga-samtalsminne.md med dessa preciseringar: signering är
inte kryptering; tidigare tolkningar är samtalshistorik och inte belägg.
HMAC med separat domän och serverhemlighet, bundet till verifierat användar-id,
24 timmars giltighet. Använd FRAGA_TRAD_SECRET eller befintlig serverhemlighet
SUPABASE_SECRET_KEY som domänseparerad reserv. Ingen ny driftshemlighet krävs.
Anonyma frågor får inget bärbart minne. Ogiltigt minne ignoreras.
Hela beräkningsberoendet följer med atomärt, annars utelämnas den turens
postkedja. Alla id-referenser och lövproveniens skrivs om till nya register-id.
Max 6 turer, högst 3 turers poster, 10 poster och 12 kB totalt.
Explicita nya bolag och perioder går före minnet; tvetydiga jämförelser gissas
inte. Båda ytorna har Börja om och användarspecifik lokal lagring.

## 3. Djupgranskning

Explicit val i båda ytorna, vanlig fråga är standard. Modellen kan registrera
högst fyra korta delfrågor via ett planeringsverktyg, och koppla sökning till
en delfråga. Planen innehåller undersökningsfrågor, inga slutsatser eller intern
tankegång. Svarens vanliga verifiering gäller oförändrat. Servern redovisar
vilka frågor som undersökts och vilka som inte bearbetats; en genomförd
sökning betyder inte att frågan är besvarad.
Djup läge: högst 14 modellanrop inklusive reparation/fallback/granskning,
4 hämtningsvarv, 8 beräkningsförsök och 12 faktiska verktygsanrop. Vanligt
läge behåller 10 modellanrop, 2 hämtningsvarv och 6 beräkningsförsök, med
8 faktiska verktygsanrop. Ingen parallell lista får kringgå taken.
Gemensam deadline 120 respektive 90 sekunder från utredningsstart; reservera
tid för slutsvar och granskning. En överskriden budget ger ett begränsat eller
felmarkerat svar, aldrig ogranskad text. Sökningsperiod valideras i servern.

## Leverans

Riktade regressionstester, projektkontroller, bygge, oberoende granskning och
skarpa API-prov via befintligt GitHub-jobb. Testgren, ingen produktionsdeploy.
