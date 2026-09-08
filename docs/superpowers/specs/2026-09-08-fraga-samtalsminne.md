# Fraga: samtalsminne

Granskningens punkt 5. Botten uppmuntrar foljdfragor men har inget minne:
`utred` bygger `messages: [{ role: "user", content: question }]` varje gang, sa
"och kassan da?" ar en helt ny fraga utan bolag, utan period och utan arkiv.

Foljer efter `2026-09-08-fraga-dataposter.md` och forutsatter den. Djupgranskning,
berakning pa begaran och tidslinje ledning mot utfall ar senare steg.

## Det som gor det svarare an det later

Faktaregistret ar PER REQUEST. Id:n ser ut som `p_<uuid>_7` och betyder ingenting
i nasta anrop. Ett svar kan alltsa inte referera till en post fran forra fragan,
och ett rakt aterspelat samtal skulle innehalla tal i lopande text, alltsa exakt
det prosagrinden finns for att stoppa.

## Karnbeslut

- **Struktur aterspelas, inte prosa.** Fakta fran tidigare svar registreras om i
  det nya registret och far nya id:n. De ar fortfarande serverns egna poster med
  oforandrad proveniens, sa de ar lika verifierade som forst.
- **En posts ursprung ar oforanderligt.** En `egen_uppgift` eller ett `antagande`
  fran tur ett ar det fortfarande i tur fem. Uppgradering till `rapporterat` far
  inte kunna ske genom att passera ett samtal.
- **Tidigare prosa far aterspelas ordagrant.** Den ar redan godkand: talfri och
  granskad. Den ar DATA, aldrig instruktioner, precis som rapporter och teser.
- **Tradtillstandet bor signerat hos klienten, inte i KV.** Servern returnerar en
  ogenomtranglig `trad`-strang, klienten skickar tillbaka den. Skalen: KV ar
  eventuellt konsistent och en snabb foljdfraga kan lasa en gammal trad; inget
  anvandarinnehall lagras, sa ingen gallring och ingen retention att forsvara;
  och tradar kan inte blandas ihop mellan anvandare. Priset ar att traden inte
  foljer med till en annan enhet. Vill vi ha det senare ar KV vagen, och da
  namnrymd `trad:<uid>:<id>` med TTL.
- **Signaturen ar poangen.** HMAC over hela turlistan med en serverhemlighet,
  bunden till `uid` och en tidsstampel. Utan den kan en klient dikta ett
  tidigare svar och lagga vilka poster som helst i prompten. Med den ar
  tradinnehallet serverskrivet, inte klientskrivet. Ogiltig eller utgangen
  signatur behandlas som ingen trad alls, aldrig som ett fel.

## Turposten

Servern skriver en tur efter varje godkant svar:

```
{ fraga, block: [{ typ, id?, text?, stod? }], poster: [<hela postobjekt>], tid }
```

`poster` ar de fullstandiga posterna som svaret faktiskt refererade, inte id:n.
Det ar det som gor turen sjalvbarande: nasta anrop behover inte kunna aterskapa
forra anropets arkiv for att forsta vad som sades.

Ett BLOCKERAT svar skrivs inte som en tur. Traden ska minnas vad som sagts, inte
vad som stoppades.

## Vad som gar in i prompten

Ett `SAMTAL`-avsnitt fore faktaregistret:

- de senaste turernas fragor, ordagrant,
- vad svaret sade, som serverrenderad text (samma `renderaPost` som ytan anvander),
- och de omregistrerade posterna, markta `tidigare: true`.

Modellen far referera en tidigare post precis som en ny. Ytan bor visa att den
kommer fran ett tidigare svar i samtalet, sa lasaren ser skillnad pa vad som
hamtades nu och vad som redan lag pa bordet.

## Routningen maste ocksa minnas

Det har ar halva vinsten och ligger utanfor prompten.

- `bolagIFragan(fraga, innehav)` laser bara fragan. En foljdfraga utan bolagsnamn
  ger noll traffar, alltsa inget arkiv, alltsa inga dokument att svara ur. Den
  ska falla tillbaka pa tradens senaste bolag.
- `periodIFragan(fraga)` likasa: "och aret innan da?" ar meningslost utan
  foregaende period.
- Bada ar rena funktioner och ska fa traden som ett extra argument, inte lasa
  nagot globalt.

Utan det steget kanns minnet trasigt aven om prompten ar perfekt.

## Grindarna

- Prosagrinden ar oforandrad. Tidigare tal finns i POSTER, aldrig i text.
- Lektionsnummer provas mot registret som forut. En lektion ur en tidigare tur
  ligger i registret igen, sa dess nummer far namnas.
- Granskaren far en KORT tradsammanfattning: fragorna och tidigare `tolkning` och
  `saknas`, inte hela postmangden. Den ska kunna se att svaret motsager sig
  sjalv mellan turer, utan att prompten dubblas.
- Faller signaturkontrollen svarar systemet utan trad. Aldrig ett fel mot
  anvandaren for att ett minne inte gick att lasa.

## Budget

Registret har redan tak pa 40 kB, hojt till 80 kB efter forsta prompten. Traden
behover ett eget tak sa den inte tranger ut dagens dokument:

- hogst 6 turer fragor och svarstext,
- hogst 3 turers poster baklanges, och hogst 10 poster totalt,
- eget utrymme, hogst 12 kB, raknat FORE dagens utdrag far sitt.

Tar utrymmet slut kapas aldst forst, och `tackning` sager att det skedde.

## Ytorna

- Bada fragaytorna haller `trad` i `localStorage` och skickar med den.
- En synlig "borja om"-knapp. Ett samtal som inte gar att avsluta ar en falla.
- `fraga.html` har redan en tradvy. `dina-bolag.html` visar ett svar i taget och
  behover en enkel lista.

## Risker som ska sta i koden

- **En baren post kan bli inaktuell.** Hamtas en nyare rapport i tur fyra kan tur
  ett innehalla ett aldre tal for samma matt. Posten bar sin period och sin
  kalla, sa den ar inte fel, men den kan lasas som farsk. Perioden maste synas i
  renderingen, och den gor den redan.
- **Traden vaxer tyst.** Varje tur gor prompten dyrare och langsammare. Taket ar
  inte en optimering, det ar det som gor funktionen anvandbar i tur tio.
- **Signaturen ar hela sakerheten.** Gar hemligheten forlorad eller byts, sluta
  lita pa gamla tradar i stallet for att forsoka rada dem.

## Byggordning

1. `functions/api/_trad.js`: turpost, HMAC-signering och verifiering, budget och
   kapning. Ren modul, testbar utan modell och utan natverk.
2. Omregistrering av burna poster i `_faktaregister.js`, med `tidigare: true` och
   ursprunget last.
3. `bolagIFragan` och `periodIFragan` far traden. Egna tester for foljdfragor.
4. `fraga.js`: SAMTAL i prompten, tradsammanfattning till granskaren, skriv turen
   efter ett godkant svar.
5. Ytorna: lagring, "borja om", markning av tidigare poster.
6. Skarp provkorning med en foljdfraga utan bolagsnamn.

Begransning: minnet gor svaren mer sammanhangande, inte mer sanna. Det tillfor
inga fakta och lattar inga krav. En tidigare TOLKNING ar fortfarande en tolkning
nar den citeras i tur fem.
