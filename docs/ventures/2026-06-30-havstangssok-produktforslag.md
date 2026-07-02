# Hävstångssök — genomarbetat produktförslag

*Datum: 2026-06-30. Roll: produktchef + systemarkitekt + UX. Status: diskussionsunderlag, inte beslutad spec.*

Arbetsnamn: **Hävstångssök** ("Bloomberg för hävstångsprodukter, fast enklare"). En söktjänst som samlar alla warranter, mini futures, bull/bear, turbos, knock-outs och tracker-certifikat från alla emittenter på en plats, med jämförelse och analys.

---

## 0. Den obekväma sanningen först (utmaning av idén)

Du bad mig utmana. Fem saker du måste internalisera innan något byggs:

1. **Datan är hela företaget.** Funktionerna (sök, filter, kort, jämförelse) är en helg var. Det svåra är: komplett produktmaster från ~10 emittenter, korrekt normaliserad, uppdaterad dagligen när tusentals minifutures knockas ut och nya listas, plus kurs- och spreaddata. Det är 80 % av arbetet och 90 % av kostnaden. Bygg organisationen runt datapipen, inte runt UI.

2. **Premissen "ingen samlar detta" är bara delvis sann.** Avanza och Nordnet har redan hävstångs-screeners (filtrera på underliggande, emittent, hävstång, typ). De är kundlåsta och har medioker UX, men de finns och är gratis för kunder. I Tyskland, världens djupaste hävstångsmarknad, är detta en mogen kategori: Börse Stuttgart/EUWAX, onvista, boerse-frankfurt, finanzen.net, Guidants/godmode. "Bloomberg för hävstång" finns i praktiken redan i DE. Den vita ytan är **Norden-fokuserat + överlägsen analys/UX + emittentneutralitet**, inte greenfield.

3. **Regulatorisk linje: "AI rekommenderar bästa produkten" kan bli investeringsrådgivning (MiFID II)**, vilket kräver tillstånd. En objektiv jämförelse-/filtertjänst (à la Pricerunner för finans) är generellt OK. Personlig rekommendation av specifika finansiella instrument är det inte. Lösning: ranka objektivt efter användarvalda kriterier, aldrig "vi rekommenderar", ingen personanpassning till användarens situation, tydliga friskrivningar. Hävstångsprodukter är dessutom MiFID-"komplexa produkter" med egna marknadsföringsregler. Att deep-linka till mäklare för affiliate är OK; att förmedla order är det inte (kräver tillstånd).

4. **Realtidskurser är dyrt och juridiskt grindat.** Nasdaq Stockholm-data kräver market data-avtal och avgift per användare för realtid. Fördröjd (15 min) är mycket billigare och fullt tillräckligt för en jämförelsetjänst i början. Spread kräver orderboks-/quote-data, den dyraste biten. Planera ekonomin runt detta.

5. **TAM-koll.** Hävstångstradare i Sverige är ett relativt litet, högintensivt, churnigt segment. Vägen till "miljardbolag" går **inte** via svenska retail-abonnemang ensamt, utan via (a) att äga den renaste normaliserade cross-issuer-databasen och sälja den B2B/API, och (b) europeisk expansion. Bygg B2C för att skapa datatillgången och varumärket; tjäna de stora pengarna B2B.

**Slutsats:** idén är byggbar och kan bli värdefull, men positionera den som *neutral data- och analysmotor*, inte som "rådgivande AI", och inse att moaten är datan, inte features.

---

## 1. Konkurrensanalys

| Aktör | Vad de gör | Lucka vi utnyttjar |
|---|---|---|
| Avanza / Nordnet screeners | Gratis för kunder, filter på hävstångsprodukter | Kundlåst, ingen cross-broker-neutralitet, svag analys (ingen KO-sannolikhet, carry-decay), trög UX |
| Emittentsajter (SG, Vontobel, BNP …) | Egna produktlistor + verktyg | Bara egna produkter, partiska, ingen jämförelse mellan emittenter |
| Börse Stuttgart/EUWAX, onvista, boerse-frankfurt (DE) | Mogen aggregering + analys | Tyskt fokus, äldre UX, inte Norden-anpassat |
| Datavendorer (Infront, SIX, Morningstar, LSEG) | Säljer rådatan (dyrt) | B2B, inget konsumentprodukt; vi blir deras kund tidigt, deras konkurrent senare |

**Vår position:** den snabbaste, snyggaste, *emittentneutrala* hävstångssöken för Norden, med analys ingen mäklare visar bra (effektiv hävstång per krona, avstånd till KO, KO-sannolikhet, carry-decay), och på sikt den renaste pan-europeiska databasen som B2B-tillgång.

---

## 2. Datastrategi (kärnan)

### Två datatyper
- **Referens-/masterdata** (per instrument): ISIN, ticker, emittent, typ, underliggande, valuta, hävstång, ratio/multipel, strike, KO-barriär, finansieringsnivå, stop loss, löptid, noteringsplats, KID-URL, prospekt-URL. Ändras vid nyemission/förfall.
- **Marknadsdata** (per instrument, tidsserie): bid/ask/last, spread, volym, ev. open interest. Realtid eller fördröjt.

### Källor (i prioritetsordning för bygge)
1. **Emittenternas dagliga masterfiler.** De flesta (SG, Vontobel, BNP, MS, UBS, Nordea, SEB, Handelsbanken, Citi, GS) publicerar dagliga produktfiler (CSV/XML) + indikativa intradagspriser. Officiella filer > skrapning (skrapning är skört och ToS-riskabelt).
2. **Nasdaq Stockholm** (noteringsplats för merparten svenska warranter/cert): referensdata + marknadsdata via Nasdaq Nordic market data-produkter (licens, avgift).
3. **boerse-frankfurt / Börse Stuttgart-API:er** för securitised derivatives (bra för referensdata och DE-expansion).
4. **Datavendor (Infront/SIX/Morningstar/LSEG)** som genväg till "alla emittenter, rent" när vi har råd, betald men turnkey.
5. **KID/PRIIPs-dokument**: varje produkt har ett KID hos emittenten, länka eller hämta.

### Uppdatering
- Masterdata: nattlig batch (efter emittenternas EOD-filer) + intradags-poll för nya noteringar.
- Priser: fördröjt 15 min i MVP (billigt). Realtid när licens finns (premium-gate, per-user-rapportering till börsen).
- Spread/quote: kräver orderboksdata, fas 2.

### Livscykel (kritiskt)
Produkter knockas ut, förfaller och avlistas ständigt (minifutures churnar i tusental). Tillståndsmaskin per instrument:
`active → knocked_out | expired | delisted` (soft delete, behåll historik).
Daglig avstämning mot emittentens masterfil; saknas en produkt → markera inaktiv, logga `product_event`.

### Härledd analys (vår egen, ej köpt)
- **Warranter:** Black-Scholes med implicit volatilitet (från emittent eller bak-löst ur pris) → delta, gamma, vega, theta.
- **Mini/turbo/KO:** mekaniskt avstånd till barriär; **KO-sannolikhet** över horisont via first-passage/barrier-hit-formel för geometrisk brownsk rörelse med historisk eller implicit vol.
- **Carry-decay:** projicerad värdeminskning om underliggande står stilla N dagar (finansieringskostnaden som tyst dödar hävstångsavkastning).
- **Effektiv hävstång per krona** och **spread-kvalitet** (nu vs historiskt typiskt).

Detta analyslager är differentieringen mäklarna inte ger.

---

## 3. Datamodell (skiss)

```
issuer(id, name, lei, country, mm_quality_score)
underlying(id, name, type[equity|index|commodity|fx|crypto], symbol/isin, currency, ref_price, ref_ts)
instrument(id, isin, ticker, issuer_id→, underlying_id→, type, currency,
           leverage, ratio, strike, ko_barrier, financing_level, stop_loss,
           maturity, listing_venue, kid_url, prospectus_url,
           status[active|knocked_out|expired|delisted], first_seen, last_seen)
quote(instrument_id→, ts, bid, ask, last, spread_abs, spread_pct, volume, oi)   # tidsserie
analytics(instrument_id→, ts, eff_leverage, dist_to_ko_pct, ko_prob_30d,
          implied_vol, delta, theta, daily_financing_cost, carry_decay_30d)      # härledd
product_event(instrument_id→, type[issued|knocked_out|expired|delisted|financing_reset], ts)
```

`instrument` + `underlying` + `issuer` i Postgres (master). `quote`/`analytics` i ClickHouse eller TimescaleDB (tidsserie, hög volym). Sökindex separat (se nedan).

---

## 4. Systemarkitektur

```
[Emittent-filer]  [Nasdaq/Börse feed]  [Vendor-API]
        \              |                  /
         →  Ingestion-connectors (per källa, Python)
                       ↓  (Kafka/Redpanda event-bus)
                Normalizer (mappar allt till instrument-schemat)
                       ↓
        Postgres (master)        ClickHouse (quotes/history)
                       ↓
        Analytics-workers (Black-Scholes, KO-prob, carry)  → analytics
                       ↓
        Sökindex (Typesense/Meilisearch/Elastic)  +  Redis-cache
                       ↓
        API (FastAPI eller Node/GraphQL)
                       ↓
        Web (Next.js/SvelteKit) bakom CDN (Cloudflare)
```

Allt händelsedrivet så livscykel (KO/förfall) propagerar direkt. Analys förberäknas, aldrig on-the-fly i requesten. Supersök drivs av ett dedikerat sökindex (Postgres FTS räcker inte för "skriv Tesla, få allt" i skala).

---

## 5. Funktioner, prioriterade (MoSCoW)

**Must (MVP):** Supersök (skriv underliggande → alla produkter), kärnfilter (typ, bull/bear, emittent, hävstång, löptid, underliggande), sortering (hävstång, spread, avstånd till KO), produktkort, jämförelse sida vid sida (2-4 st), härledd analys (effektiv hävstång, avstånd till KO), länk till KID + mäklare.

**Should (v2):** realtidskurser, alla emittenter, sparade sökningar + konton, larm (nära KO, pris, spread-blowout), scenariosimulator (om underliggande ±1/2/5/10 %), KO-sannolikhet, spread-historik.

**Could (v3):** full greeks + risk-graf, "ersätt min produkt" (klistra in ISIN → bättre alternativ), backtest mot senaste rörelsen, carry-decay-projektion, portfölj/innehav-integration, mobilapp, DE/EUWAX-expansion.

**Won't (medvetet bort tidigt):** orderförmedling/execution (tillståndskrävande), "AI rekommenderar" som personlig rådgivning, social/community.

### Funktioner du inte nämnde (mitt tillägg)
- **Carry-decay-kalkylator** över innehavsperiod, finansieringskostnaden som tyst äter minifutures. Den enskilt mest underskattade siffran.
- **"Ersätt min produkt":** klistra in en ISIN du äger → likvärdiga-eller-bättre alternativ rankade (lägre spread, billigare carry, längre till KO).
- **Emittent-tillförlitlighet:** hur tighta/konsekventa quotes, hur ofta de gappar, market-making-kvalitet. Ett eget dataset ingen annan har.
- **KO-heatmap** över underliggandes prisspann.
- **Spread-vid-tid-på-dygnet-mönster** (emittenter vidgar spread vid öppning/stängning).
- **Sentiment à la EUWAX:** aggregerat bull/bear-flöde när du har volymdata, en unik dataprodukt.
- **Skatt-/ISK-vs-depå-info** (endast upplysning).

---

## 6. AI-/analysfunktioner (konkret, med matematiken)

- **"Mest exponering per krona":** ranka på effektiv hävstång justerad för spread + carry, inte nominell hävstång.
- **"Finns bättre hos annan emittent":** optimerare över master+analytics som håller underliggande/riktning/ungefär hävstång fast och minimerar (spread + carry + KO-risk).
- **"Är KO för nära":** dist_to_ko_pct vägt mot underliggandes historiska dagsvol → röd/gul/grön.
- **Scenariomotor:** för warrant via Black-Scholes-omvärdering vid nytt spot; för mini/turbo linjärt med hävstång tills barriär, sen noll. Visa utfall vid ±1/2/5/10 %.
- **KO-sannolikhet:** barrier-hit-sannolikhet för GBM givet vol och horisont, visad grafiskt.

LLM används sparsamt och säkert: naturligt språk in ("billig Tesla-bull med låg risk att knockas") → strukturerad query, **aldrig** för att hitta på siffror. All output härledd ur datan. Ramas som verktyg, inte råd.

---

## 7. UX-flöden + wireframe-idéer

Designprincip: TradingView möter Apple. Tangentbordsdrivet, omedelbart, tätt men luftigt. Mörkt default.

**Supersök (landning):**
```
┌───────────────────────────────────────────────┐
│  Hävstångssök            [ Tesla__________ ⌕ ]  │
│  Senaste: OMX · Guld · NVIDIA · Olja            │
└───────────────────────────────────────────────┘
   skriv → dropdown grupperat per underliggande:
   ▸ Tesla Inc (aktie)  142 produkter
   ▸ Tesla via OMX-korg  …
```

**Resultat (kärnvyn):**
```
Tesla · 142 produkter        [Bull][Bear] [Typ▾][Emittent▾][Hävstång▾][Mer▾]
┌ Sortera: Effektiv hävstång ▾ ─────────────────────────────────────────────┐
│ ☐ Emittent   Typ    Häv.  Spread  Till KO   Carry/dag  Pris   Idag   KID │
│ ☐ SG         Mini   ×12   0,4 %   8,2 %     0,03 %     4,21  +6,1%   ↗   │
│ ☐ Vontobel   Turbo  ×11   0,3 %   9,0 %     0,02 %     2,88  +5,4%   ↗   │
│ ☐ BNP        Warr.  ×10   0,6 %   n/a       theta -…   1,17  +9,8%   ↗   │
└───────────────────────────────────────────────────────────────────────────┘
   [ Jämför valda (2) ]
```

**Produktkort:** alla fält + risk-graf (värde mot underliggande, KO-markör) + scenariorad (±1/2/5/10 %) + carry-decay-kurva + KID/prospekt-länk + "ersätt denna".

**Jämförelse:** kolumner sida vid sida (som mobiljämförelse), skillnader markerade, "bäst på raden" highlightad per metrik.

---

## 8. Teknisk stack (förslag)

- **Ingestion/normalisering/analys:** Python (pandas, QuantLib för greeks), Kafka/Redpanda.
- **Lagring:** Postgres (master), ClickHouse eller TimescaleDB (tidsserie).
- **Sök:** Typesense eller Meilisearch (snabb, typo-tolerant Supersök).
- **API:** FastAPI eller Node + GraphQL.
- **Cache:** Redis + CDN (Cloudflare).
- **Web:** Next.js eller SvelteKit, mörkt tema, tangentbordsnav.
- **Infra:** containers, en molnleverantör, allt event-drivet.

---

## 9. Affärsmodell

- **B2C freemium:** gratis = fördröjd data + bas. **Premium** (~99-199 kr/mån) = realtid, larm, scenariosim, optimerare, ingen reklam.
- **Affiliate/partnerprovision:** deep-link till mäklare. Försiktigt vid rådgivningslinjen, men hänvisning är vanligt.
- **B2B API:** den renaste normaliserade cross-issuer-datan som produkt, den mest hållbara intäkten.
- **White-label-widget** för mäklare/medier.
- **Dataförsäljning/licens** + **företagslicenser** (Bloomberg/SIX-kund-segmentet).
- **Sentiment-dataprodukt** när volymdatan finns.

**Utmaning till modellen:** mäklarna är samtidigt kund, konkurrent och affiliate-källa. Emittenter kan vilja betala för placering, gör det aldrig, neutraliteten *är* varumärket. Durabel intäkt = B2B-data/API + premium, inte reklam eller betald ranking.

---

## 10. MVP (2-3 månader) + roadmap

**MVP, hård scoping:**
- Endast Sverige. 3-5 största emittenterna (t.ex. SG, Vontobel, BNP, Nordea + en).
- Referensdata + EOD/15-min fördröjda priser. **Ingen** realtidslicens ännu.
- Mest handlade underliggande: OMX, några storbolag, guld, olja, USD/SEK, ev. BTC.
- Supersök + kärnfilter + produktkort + jämförelse + härledd analys (effektiv hävstång, avstånd till KO).
- Ingen AI-reco, inga larm, inga konton (eller minimal e-post-vänteliste).
- **Differentiering redan i MVP:** analyslagret (hävstång per krona, avstånd till KO, KO-sannolikhet) + ren cross-issuer-jämförelse + utmärkt Supersök.

**v2:** realtid (licens), alla emittenter, konton + sparade sökningar, larm (nära KO/pris/spread), scenariosimulator, KO-sannolikhet, spread-historik.

**v3:** full greeks + risk-graf, "ersätt min produkt", backtest, carry-decay, portfölj/innehav, mobilapp, start på DE/EUWAX.

**v4:** pan-europeisk databas, white-label/B2B-API i skala, datalicens/återförsäljning, sentiment, partnerskap för execution, "best execution"-intelligens.

---

## 11. Risker (rangordnade)

1. **Datakomplett-het och -kostnad** + realtidslicenser. Den verkliga uppförsbacken.
2. **Regulatorisk linje** (rådgivning vs information). Lös med positionering + jurist tidigt.
3. **Konkurrens** från Avanza/Nordnet (gratis för kunder) och mogna DE-aktörer.
4. **TAM** för svensk retail ensamt, vägen till stort går via B2B + Europa.
5. **Neutralitet vs intäkt:** betald ranking dödar förtroendet.

## 12. Min rekommendation

Bygg MVP:n exakt som ovan, **men sälj den inte som "Bloomberg" eller "AI-rådgivare".** Sälj den som *den neutrala, snabbaste hävstångssöken för Norden med analys mäklarna inte ger*. Bevisa att du kan hålla cross-issuer-datan ren och färsk på 5 emittenter, för det är det enda som är svårt och det enda som är värt något. Klarar du det är databasen i sig den verkliga tillgången, och då finns B2B-vägen mot något stort.
```
