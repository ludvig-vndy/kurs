# Ägar-AI — AI-analytiker för dina innehav (produktförslag)

*Datum: 2026-06-30. Roller: produktchef + investeringsanalytiker + AI-arkitekt + UX. Status: diskussionsunderlag.*

Arbetsnamn: **Ägar-AI** (en personlig AI-analytiker som bevakar, läser och förklarar dina innehav dygnet runt). Knyter an till Marginalens filosofi: tänk som ägare, inte spekulant.

---

## 0. Den ärliga bedömningen först (utmaning)

Du bad mig utmana och ta bort det som inte skapar värde. Sju saker, läs dem innan något annat:

1. **"Den enda tjänst en investerare behöver" är redan någons vision, och de bygger den nu.** FinChat.io (numera **Fiscal.ai**, 2025) är nästan exakt det här: konversations-AI över fundamenta + transkript + estimat, "Koyfin möter ChatGPT". **AlphaSense** (köpte Sentieo) är guldstandard för "AI läser alla filings/transkript/analyser" i enterprise. **Koyfin, Tikr, Quartr, BamSEC, Perplexity Finance, Bloomberg GPT** angriper bitar. Det här är den mest trängda, bäst finansierade av dina tre idéer. Att gå head-on globalt = mycket svårt och kapitalkrävande, och du startar bakom.

2. **Datan är åter hela företaget, fast dyrare.** Tre dyra, juridiskt grindade domäner: (a) fundamenta + estimat (S&P Capital IQ, FactSet, LSEG, Visible Alpha, eller nordiskt Börsdata/Millistream/Infront), (b) nyheter + filings + transkript (Cision/MFN/Nasdaq för nordiska pressmeddelanden, transkript via egen ASR på webcasts, analytikerresearch är stenhårt gated), (c) registerdata. En seriös täckning är en datakostnad på sexsiffrigt belopp per år *innan intäkt*. AI:n (LLM) är numera den billiga delen.

3. **Hallucination i finans = omedelbar död.** Om din AI säger fel vinst för ett bolag en gång tappar du allt förtroende. Hela produkten står och faller med **grundning**: varje sifferpåstående hämtas deterministiskt ur strukturerad data, LLM:en *räknar aldrig och minns aldrig* tal, den *förklarar* förberäknade tal, och varje påstående citerar ett tidsstämplat källdokument. Det här är samma princip som warrant-motorns ranking och Marginalens hårda regel "hitta aldrig på siffror". Det är den röda tråden i allt du bygger, och det är rätt arkitektur.

4. **"Vad bör jag göra nu?" är investeringsrådgivning (MiFID II).** Köp/sälj-signaler kräver tillstånd och är en ansvarsfälla. Skriv om till "vad har ändrats mot din egen tes" och "vad bör du hålla koll på", information, inte rekommendation. Samma sköld som warrant-tjänsten.

5. **Att koppla Avanza/Nordnet är inte löst.** Det finns ingen ren officiell PSD2-motsvarighet för värdepappersinnehav i Sverige. Aggregering har historiskt gjorts via skrapning (Tink m.fl.) eller manuell import. Räkna med friktion; börja med manuell/CSV-import + ev. Tink/öppna-bank-investeringar där det finns.

6. **Funktionslistan är ~150 punkter, det är fem produkter, inte en MVP.** En världsledande PM skär brutalt. Socialt/Reddit/X-sentiment, podcasts/YouTube-ASR, auto-konkurrentidentifiering, "Opportunity/Risk Engines" som ger köp/sälj-vibbar, allt det är v2+ eller bort. Det skapar inte värde i en MVP, det skapar brus och risk.

7. **Din wedge är inte att slå Bloomberg. Det är Norden + ägarfilosofin + förtroende.** Börsdata äger nordisk fundamentadata men har ingen AI-analytiker. De globala AI-spelarna betjänar inte nordisk retail, svenska pressmeddelanden, FI:s register eller svenska språket väl. Och ingen av dem har en **uttalad investeringsfilosofi**, de är neutrala terminaler. Du har en kurs som lär ut ett *sätt att tänka*. En AI som tänker som kursen lär ut (ägare, inte spekulant; fundamenta över brus; temperament) är något bara du kan bygga. **Kursen är din moat, din differentiering och din kundanskaffning.**

**Slutsats:** bygg inte "allt åt alla". Bygg **AI-ägaranalytikern för nordiska långsiktiga investerare**, snävt scopad, med stenhård grundning, med Marginalen som tratt och filosofi. Marginalen → gratis smakprov → betald AI-analytiker.

---

## 1. Konkurrensanalys

| Aktör | Styrka | Lucka vi utnyttjar |
|---|---|---|
| **Fiscal.ai (f.d. FinChat)** | AI-chat över fundamenta + transkript, global, institutionell data | Ingen nordisk djuptäckning, ingen broker-koppling för nordisk retail, neutral (ingen filosofi), engelska |
| **AlphaSense / Sentieo** | AI-sök över filings/transkript/research, enterprise | $$$ enterprise, inte för privatinvesteraren, inte portfölj-/innehavscentrerad |
| **Koyfin / Tikr** | Billig Bloomberg-light, fundamenta + dashboards | Svag/ingen AI-analytiker, ingen innehavsbevakning med larm, ej nordiskt fokus |
| **Quartr** | Transkript + AI-sammanfattning av earnings calls | Bara IR-lagret, ingen portfölj/tes/risk-helhet |
| **Börsdata** | Bäst nordiska fundamenta, älskad av svensk retail | Ingen AI-analytiker, ingen nyhets-/tes-bevakning, ingen narrativ förklaring |
| **Avanza / Nordnet** | Har innehavet, viss news/insider | Ingen djup AI-analys, neutralt, inlåst |

**Position:** den AI-analytiker Börsdata saknar, på den nordiska data Fiscal.ai saknar, med den ägarfilosofi ingen av dem har.

---

## 2. Kärnprincip: grundad AI (arkitekturtesen)

Allt vilar på en regel: **siffror är deterministiska, språk är AI.**

- Strukturerad extraktion drar de *rapporterade* talen ur rapport/XBRL/filing in i ett schema.
- Deltan (mot 8-12 kvartal, mot konsensus) beräknas **i kod**, inte av LLM:en.
- LLM:en *narrerar* de förberäknade talen och citerar källan. Den anger aldrig ett tal som inte finns i hämtad kontext.
- En verifieringslager korskollar varje numeriskt påstående mot fundamentadatabasen innan det visas.
- Varje mening i varje sammanfattning länkar till primärkällan + tidsstämpel.
- AI:n märker varje påstående: **faktum (källa)** / **slutsats (resonemang)** / **vet ej**. "Vet ej" är tillåtet och byggs in.

Det här är skillnaden mellan en leksak och en tjänst seriösa investerare litar på.

---

## 3. Produkt och UX, de fyra hjälteflödena

Skär bort allt annat tills dessa fyra är magiska:

**1. Morgonbriefingen (den personliga analytikern som jobbat över natten).**
Koppla/importera innehav → varje morgon en 60-sekunders genomgång, **rankad efter påverkan på just din portfölj**. "3 saker som betyder något idag, 11 du kan ignorera." Anti-brus är en feature, inte en bugg.

**2. Rapportanalys (grundad).**
Bolag släpper rapport → strukturerad extraktion + delta mot 8-12 kvartal och mot konsensus (beräknat i kald), AI narrerar: kort sammanfattning, det viktigaste, bra/dåligt, överraskningar mot förväntan, ändrad guidning/marginal/kassaflöde/skuld, VD/CFO-citat (verbatim ur transkript), allt citerat.

**3. Tes-spårning (din unika feature, kursdriven).**
Du skriver din **tes i en mening** (kursens "varför tjänar bolaget pengar och varför mer i framtiden"). AI:n bevakar nyheter/rapporter *mot din tes* och flaggar bara när något **materiellt utmanar den**. Det besvarar "har caset förändrats?" på ett sätt neutrala terminaler inte kan, håller AI:n grundad i *dina* kriterier, och håller sig på rätt sida om rådgivningslinjen.

**4. Fråga-vad-som-helst (grundad chat).**
"Varför föll aktien idag?" "Vad säger senaste rapporten?" "Vad missar marknaden?" Svar med citat, med faktum/slutsats-märkning, aldrig påhittade tal.

Dashboard och akties-sida hänger ovanpå dessa fyra. Jargong länkar till kurslektionen (utbildnings-flywheel).

---

## 4. Funktioner, prioriterade (MoSCoW)

**Must (MVP):** innehavsimport (manuell/CSV först), morgonbriefing rankad efter portföljpåverkan, grundad rapportanalys med kvartals- och konsensusdelta, tes-spårning, grundad chat, nordiska pressmeddelanden (MFN/Cision/Nasdaq), insider (FI insynsregister), blankning (FI/Holdings), kommande rapporter/utdelningar, citat/källprovenans överallt.

**Should (v2):** earnings-call live-läge (realtidstranskript + flagga överraskningar live), estimatrevideringar, riktkurs-/analytikerförändringar, portföljnivå-risk (koncentration: "3 innehav beror på samma kund/råvara/ränta"), broker-koppling via Tink, makro-/råvaru-/valutapåverkan på dina bolag.

**Could (v3+):** auto-konkurrentanalys, transkript-ASR i skala, VD-intervju/podd/YouTube-sammanfattning, internationell täckning (USA), historik-tidslinje med AI:s tidigare analyser + utfall ("AI sa X förra kvartalet, så blev det").

**Won't (medvetet bort tidigt):** Reddit/X/forum-sentiment (brusigt, lågt förtroende, svårt), "köp/sälj"-signaler (rådgivning), "Opportunity Engine" som rekommenderar (rådgivning + spekulant-vibb, strider mot filosofin). Risk-motorn behålls men **omformad** (se nedan).

**Omformning av Risk/Opportunity Engine:** istället för köp/sälj-signaler, en **pre-mortem à la kursen**: "vad skulle behöva vara sant för att din tes ska gå sönder, och har något av det börjat?" Ägarsinne, inte tradersignaler. Datapunkterna bakom varje flagga visas alltid.

---

## 5. AI-arkitektur

```
Källor → Ingestion → Normalisering → {Strukturerad DB (fakta/tal)  +  Vektor-DB (text-chunks, embeddings)}
                                                   │
   Användarfråga / händelse → Agent-orkestrering (planner)
       ├─ Retrieval (hybrid: vektor + nyckelord + tidsfilter, per innehav/bolag)
       ├─ Faktahämtning (deterministisk, ur strukturerad DB)
       ├─ Beräkningar (deltan, multiplar) i kod
       └─ LLM-narrering (strikt grundnings-prompt, structured output)
                                                   │
                          Verifieringslager (korskoll tal mot DB, citat-koll)
                                                   │
                          Svar med citat + faktum/slutsats-märkning
```

- **RAG** över ett kurerat, tidsstämplat, citatförsett korpus per bolag/innehav.
- **Agentisk bevakning:** schemalagda jobb per innehav som kör retrieval på nytt material, kör tes-diff, och triggar larm endast vid materiell förändring.
- **Modeller:** stora resonemangsmodeller (Claude Opus-klass) för analys/narrering; mindre/billiga för klassning, dedup, ruttning; egna embeddings för retrieval. LLM:en byts modulärt.
- **Guardrails:** grundnings-prompt + verifieringslager + "vet ej"-väg + eval-svit som regressionstestar mot kända rapporter (hallucination = blockerande fel).

---

## 6. Systemarkitektur, datamodell, stack

**Backend:** händelsedriven ingestion (Python-connectors per källa) → kö (Kafka/Redpanda) → normalizer → lagring. API i FastAPI/Node (GraphQL för klient, REST för intern). Jobb-/schemaläggare för bevakning (Temporal/Celery).

**Databaser:**
- Postgres: användare, portföljer, innehav, teser, bolag-master, händelser.
- Tidsserie (ClickHouse/Timescale): priser, fundamenta-historik.
- Vektor-DB (pgvector/Qdrant/Weaviate): text-chunks + embeddings.
- Objektlagring (S3): råa dokument (rapporter, transkript, PDF), KID/filings.
- Cache (Redis), sök (Elastic/Typesense), CDN.

**Datamodell (skiss):**
```
user(id, ...) ─< portfolio(id, user_id) ─< holding(id, portfolio_id, company_id, qty, gav)
company(id, name, isin, ticker, listing, sector, peers[])
thesis(id, holding_id, user_id, text, criteria[], created_at)
document(id, company_id, type[pr|report|transcript|filing|insider|short|news], url, published_at, source, hash)
chunk(id, document_id, text, embedding, span)
fact(company_id, metric, period, value, unit, source_document_id)        # deterministiska tal
event(id, company_id, type, ts, payload, impact_score, portfolio_relevance)
ai_brief(id, user_id, date, items[ {event_id, summary, why, citations[], sentiment, confidence} ])
ai_analysis(id, document_id, sections{...}, citations[], created_at, model)   # versionerad, granskbar
```

**Frontend:** Next.js/SvelteKit, mörkt default, snabb, tangentbordsdriven. Mobil-PWA för briefing/larm. Designspråk: lugn, tät, citat-först (varje påstående klickbart till källa).

**API-struktur:** `/portfolio`, `/holdings`, `/company/{id}/brief|report|facts|timeline`, `/ask` (chat, streaming), `/thesis`, `/alerts`. Webhooks för larm. Publikt API och white-label som egen produkt (se affärsmodell).

---

## 7. Datakällor

| Domän | Källor | Frekvens | Not |
|---|---|---|---|
| Fundamenta + estimat | Börsdata/Millistream/Infront (nordiskt), S&P/FactSet/LSEG (globalt), Visible Alpha (estimat) | Dagligen/EOD + vid rapport | Estimat dyrast och mest gated |
| Pressmeddelanden/regulatoriskt | MFN.se, Cision, Nasdaq/Globe Newswire, bolagens IR | Realtid (push) | Nordisk disclosure-kärna |
| Filings/rapporter | Bolags-IR, Bolagsverket, SEC (EDGAR, gratis, för USA) | Vid släpp | XBRL där det finns |
| Transkript | Egen ASR på webcasts, Quartr-licens | Vid call | ASR-kostnad, v2 |
| Insider | **FI:s insynsregister (gratis, offentligt)** | Dagligen | Nordisk gratis-fördel |
| Blankning | **FI:s register över korta nettopositioner ≥0,5 % / Holdings (gratis)** | Dagligen | Nordisk gratis-fördel |
| Makro/råvara/FX/ränta | Riksbanken, SCB, ECB (gratis) + vendor för intradag | Dagligen | |
| Nyheter | Dow Jones/Benzinga/lokala via API | Realtid | Brusfilter krävs |

**Kvalitetssäkring:** primärkälla slår sekundär; tal valideras mot strukturerad DB; vid motstridiga uppgifter visas båda med källa och tidsstämpel (aldrig tyst val). Dedup via embeddings + hash. Den fria nordiska registerdatan (insider, blankning, makro) är en reell kostnads- och differentieringsfördel.

---

## 8. Säkerhet och GDPR

Innehav + ev. broker-koppling = känslig finansiell persondata. Kryptering i vila och transit, strikt åtkomststyrning, audit-loggar, dataminimering, EU-datalagring, tydligt samtycke, ingen vidareförsäljning av individdata. Broker-credentials hanteras via licensierad aggregator (Tink), aldrig i klartext hos oss. SOC 2-väg för enterprise/förvaltarkunder.

---

## 9. Skalbarhet

Allt händelsedrivet och bolagscentrerat: bevakning, retrieval och analys cachas per bolag och fan-outas till användare som äger bolaget (analysen görs en gång, återanvänds av alla ägare). LLM-kostnad styrs via klassning (billig modell sållar, dyr modell analyserar bara det relevanta). Kö + horisontella workers. Per-bolag-cache gör att 10 000 användare med överlappande innehav inte ger 10 000x AI-kostnad.

---

## 10. Wow-funktioner och moats (5 år fram)

- **Tes-spårning** (hjältefeature): din mening, bevakad. Ingen neutral terminal gör det.
- **"Vad har ändrats sedan du senast tittade"**: personlig diff, inte generiska nyheter.
- **Earnings-call live-läge**: realtidstranskript + AI flaggar avvikelser mot konsensus *medan callet pågår*, tes-medvetet.
- **Portfölj-korsrisk**: "tre av dina innehav hänger på samma kund/råvara/ränta", det användaren inte kan se själv.
- **Provenansliggare**: varje briefing granskbar till primärkälla + AI:ns resonemang. Förtroende som moat.
- **Ansvarstidslinje**: "AI:n sa X förra kvartalet, så blev det." De flesta gömmer sina gamla analyser; vi visar dem.
- **Signalbudget / tyst läge**: en daglig genomgång inställd på "bara det en ägare skulle agera på", inte trader-brus. Filosofin som produkt.
- **Jargong → lektion**: varje term länkar till Marginalen. Utbildnings-flywheel som ingen konkurrent har.

Den största konkurrensfördelen är inte en enskild feature, det är **förtroende-arkitekturen (grundning + citat + märkning) + nordisk djupdata + kursfilosofin** i kombination.

---

## 11. Affärsmodell

- **Freemium:** 1-3 innehav, daglig briefing, grundad chat med tak. Tratt från Marginalen.
- **Premium (privat, ~149-249 kr/mån):** obegränsade innehav, rapportanalys, tes-spårning, larm, live-läge.
- **Pro (~499-990 kr/mån):** djup historik, export, API-tak, korsrisk, prioriterad data.
- **API / white-label:** den grundade analys- och nordiska datamotorn som produkt för mäklare, medier, fintech.
- **Kapitalförvaltare / family offices:** team, compliance-loggar, SOC 2, custom-teser, on-prem-data. Den durabla, högmarginalintäkten.
- **Marginalen-bundle:** kurs + verktyg som ett ägar-ekosystem.

Durabel intäkt = Pro + B2B/förvaltare, inte gratis-retail ensamt.

---

## 12. Roadmap

**MVP (3-4 mån):** Norden, manuell/CSV-innehav, morgonbriefing rankad efter portföljpåverkan, grundad rapportanalys (kvartals- + konsensusdelta), tes-spårning, grundad chat, pressmeddelanden + insider + blankning, källprovenans överallt. Ingen broker-koppling, inget socialt, ingen ASR.

**V2:** broker-koppling (Tink), earnings-call live-läge, estimat/riktkurs/analytikerförändringar, portfölj-korsrisk, makro/råvarupåverkan, mobil-PWA med push.

**V3:** auto-konkurrentanalys, transkript-ASR i skala, intervju/podd/video-sammanfattning, historik-tidslinje + ansvarstidslinje, USA-täckning.

**V4:** förvaltar-/family office-svit (team, compliance, on-prem), publikt API/white-label i skala, internationell expansion, egen finansjusterad modell.

---

## 13. Risker (rangordnade)

1. **Datakostnad och -licenser** (fundamenta + estimat + transkript). Den verkliga uppförsbacken.
2. **Hallucination / förtroende.** Löses med grundnings-arkitekturen, eller inte alls.
3. **Trängd marknad** med finansierade incumbents (Fiscal.ai, AlphaSense). Wedge = Norden + filosofi + förtroende.
4. **Rådgivningslinjen** (MiFID II). Information, aldrig köp/sälj.
5. **Broker-aggregering** olöst tekniskt/juridiskt. Börja manuellt.
6. **Scope.** Frestelsen att bygga allt. Skär till de fyra hjälteflödena.

## 14. Rekommendation

Bygg **inte** "den enda tjänsten en investerare behöver", det är incumbent-dödar-fantasin och vägen till att bränna kapital mot Bloomberg och Fiscal.ai. Bygg **AI-ägaranalytikern för nordiska långsiktiga investerare**: de fyra hjälteflödena, stenhård grundning, nordisk djupdata, och Marginalen som filosofi och kundtratt. Bevisa att morgonbriefingen + tes-spårningen + grundad rapportanalys är så bra och så pålitliga att en seriös långsiktig investerare inte vill vara utan dem. Det är vinnbart, det är ditt, och det bygger på exakt den moat du redan har: kursen och principen att aldrig hitta på en siffra.
