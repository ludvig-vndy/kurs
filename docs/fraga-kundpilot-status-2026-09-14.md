# Kundpilot: byggd och provad, inte klar f?r utrullning

Bas: driftsatt 2253ea7. Separat arbetsgren fraga-kundpilot, kod pushad till och med 3906e97. Ingen merge eller deploy.

Se [resultatrapporten](fraga-kundpilot-resultat-2026-09-14.md) och [alla faktiska svar](fraga-kundpilot-svar-2026-09-14.md).

## Levererat

Lokal testchatt genom samma onRequestPost, postregister, svarsgranskning, signerade samtal och FragaSvar-rendering som produktionen. Baslinje och pilot v?ljs i gr?nssnittet. Extern research aktiveras av en server?gd callback, inte av klienten. Piloten s?ker kandidater och l?ser valda HTML-original. S?kutdrag registreras aldrig som fakta.

HTML-l?sningen kontrollerar DNS och omdirigeringar, l?ser destinationens adress och begr?nsar bytes/tid. Dokumenttext, hash och h?mtningstid sparas. Hela meningsf?nster registreras som neutrala dokumentcitat. Granskaren f?r ocks? registrerade externa dokument som generatorn inte valde. Detta ger sp?rbarhet, ingen sanningsgaranti.

## Verifierat och begr?nsningar

- Kodsviten efter sista kod?ndringen: 684 godk?nda, 3 ?verhoppade, inga fel. Check godk?nd, bygge 278 sidor.
- Lokal webbl?sarkontroll och signerad f?ljdfr?ga med modellstubbar genomf?rda. F?ljdfr?gor ?r inte skarpt j?mf?rda.
- Tio skarpa fr?gek?rningar p? Unibap/Bifrost och Sivers/POET, samma publika arkivhash. AAC och BEACONSAT-f?llan ?r f?rberedda men inte k?rda.
- Ludvig godk?nde nyckel?verf?ringen. KUNDPILOT_CHAT_API ?r konfigurerad i Actions och jobbet har k?rts fyra g?nger. Det tidigare godk?nnandehindret ?r l?st.
- Extern h?mtning fungerar i flera prov, men analysfel, tappad relevant information, formatblockeringar och l?nga svar ?terst?r. Piloten ?r inte produktionsklar.
- Fyra h?mtningsvarv i djupa l?get ?r of?r?ndrade. Fulla dokument/kandidatlistor ?teranv?nds inte mellan fr?gor. HTML, UTF-8 och okomprimerade svar st?ds; ingen PDF-utbyggnad.

Starta lokalt: node tools/fraga-kundpilot-server.mjs --env C:/dev/kurs/.env --port 8789. Utan --fixture ?r arkivet uttryckligen tomt och f?r inte kallas produktionsbaslinje. Den lokala milj?n saknar Anthropic-nyckel; de skarpa proven k?rdes i Actions med befintlig hemlighet.
