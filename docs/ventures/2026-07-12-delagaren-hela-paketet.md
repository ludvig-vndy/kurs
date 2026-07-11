# Delägaren, hela paketet

Uppdaterad 2026-07-12. Master-översikt över den planerade produkten som den ser ut
nu. Ersätter `2026-07-02-final-boss-produktpaket.md` som aktuell paketbild (den är
kvar som historik). Detaljer bor i egna dokument, pekare sist.

---

## 1. Vad Delägaren är, i en mening

> En plattform för fundamental aktieanalys och automatiserad bolagsbevakning, som
> säger till när något **du själv** sagt är viktigt har ändrats i dina bolag, och
> lär dig hantverket under tiden. Aldrig köp- eller säljråd, besluten är dina.

Inbjudningsstyrd, premium, för seriösa ägare, inte massmarknad. Namnet bär tesen:
en delägare, inte en aktiespekulant.

## 2. Positioneringen (moaten)

Skillnaden mot en aktieapp är att tjänsten **minns dig**:

- Den vet **varför** du äger (tesen).
- Den vet **vad du sagt är viktigt** (trådarna, dina gränser).
- Den vet **hur du betett dig** (beslutsdagboken).

Tre saker en mäklargraf strukturellt inte kan kopiera. Ju längre man stannar, desto
rikare blir minnet, desto dyrare att lämna. Kärnprincipen:

> Vi stör dig bara när något du sa var viktigt har ändrats. Tystnaden är beviset
> på att allt är lugnt.

**Positioneringsvakter (hårda regler):** försäkring är metafor aldrig löfte (ingen
"vi skyddar dina pengar"); ingen låtsad precision (intervall + mekanism, inte
prognos); källa på varje tal.

## 3. Paketets delar

Två världar under ett skal: **Hantverket** (kursen) och **Maskinen** (verktygen och
vaksamheten), sammanbundna av den dubbelriktade kurskopplingen.

| Del | Vad det är | Status |
|---|---|---|
| **Kursen** (Hantverket) | Fundamental analys, 18 kapitel / 62 lektioner (Fokus-spelaren), plus textkursen 127 lektioner / 24 moduler. Quiz, repetition, ordlista, Multibagger-modulen, Sebastians röst invävd. | **Klar, live** |
| **Analysverktyget** (`/verktyg`) | Checklistedriven genomgång före köp: kvalitet, moat, värdering, felmarginal. | **Klar, live** |
| **Ägarbrevet** | Morgonbrevet 07:30: allt väsentligt i dina bolag, risk-först, källänkat, text och (planerad) ljudutgåva. | **Prototyp, nu data-driven** ur brief-motorn |
| **Vaksamheten** (teser + trådar) | Du säger varför du äger + sätter gränser (marginalgolv, utspädningstak, runway). Motorn larmar bara vid korsning. | **Rygg byggd och testad, körs på exempeldata** |
| **Tes-tidslinjen** | Innehavets kurva annoterad med trådhändelser, insiders, dina beslut, och ett tes-band (intakt/glider/bruten). Produktens visuella kärna. | **Assembler + första vy byggd offline** |
| **Fråga** | AI-chat grundad i dina innehav och kursen, svar med källa, aldrig påhittade tal (Haiku). | **Endpoint live, tunn** |
| **Upptäck** | Insyn ur FI:s register kopplat till dina bolag, plus spaning. | **FI-data live (riktig)** |
| **Rapportkollen** | Tung rapportanalys: siffror mot källa, delta mot historik (Sonnet). Matar vaksamhetens `holding_figures`. | **Endpoint finns, tunn** |
| **Beteendespåret** (disciplinerad tvilling) | Beslutsdagbok + friktion före affär + kvartalsvis beteendegap. Kursen bevisad med egna pengar. | **Planerad (Fas 4)** |
| **Hävstång** | Separat taktisk dörr, "bäst enligt dina kriterier". | **Prototyp** |

## 4. Den bärande arkitekturen

Allt vilar på en deterministisk rygg, byggd och testad (46 tester), i `motor/vigilans/`:

```
Import -> fånga tes + trådar -> siffror (Rapportkollen/datakälla)
       -> tripwire-motorn matchar -> händelser (+ kurskoppling)
       -> renderas som Ägarbrev OCH som markörer på tes-tidslinjen
```

- **Deterministisk motor, inte LLM**, för larmen (tillit). LLM till extraktion (Sonnet)
  och Q&A (Haiku).
- **Källa följer varje tal.** Ingen siffra i ett larm utan spårbar referens.
- **Dubbelriktad kurskoppling:** en tråd som larmar pekar på rätt lektion; en läst
  lektion föreslår en handling på ett riktigt innehav.
- **Tidslinje-redo data** från dag ett (prices, dated/typed markers, tes-band).

## 5. Prissättning

Gäller den **fullständiga produkten**, tas ut först när vaksamheten är live (annars
säljer man ett löfte).

| Nivå | Innehåll | Pris (riktning) |
|---|---|---|
| **Kursen** (ingång) | Hela kursen + analysverktyget | ~1500 till 2500/år |
| **Delägaren** (full) | Kursen + Ägarbrevet + trådbevakning + tes-tidslinjen + beteendespåret + Fråga | **5000/år** (795/mån) |

Årspriset (5000) är hjältepriset; månad är prova-ankaret. Premiumnivån bär, men först
när maskinen bär den. Låt betan pris-testa mot inbjudna.

## 6. Roadmap (faser)

Full plan: `docs/superpowers/plans/2026-07-11-portfoljforsakring-pipeline.md`.

- **Fas 0:** datakälle-beslut (Börsdata Enterprise / FMP-licens), migration, vakter.
- **Fas 1:** tes/tråd-fångst (UI + endpoint).
- **Fas 2:** vaksamhetsloopen live på ETT riktigt innehav, renderad som brev OCH
  tidslinje. **Detta gör produkten sann istället för demo.**
- **Fas 3:** händelseflöden (insiders, kalender, runway, kallelse/emissionsmandat).
- **Fas 4:** beteendespåret (tvillingen, beteendegapet) = tidslinjens lager 3 och 4.
- **Fas 5:** kurs-loopen tätare (lektion i rätt ögonblick, checklistor per innehav,
  post-mortem-case).
- **Fas 6:** årlig portföljhälsorapport, paketering, Stripe.

## 7. Vad som gatar allt

- **Datakälla med kommersiell licens.** Retail-tiers får inte visas för betalande
  kunder. Grindar hela vaksamheten. (Gratis nu: FI-insyn.)
- **Go-live-blockerare** (SMTP, domän, Supabase-redirect, Fråga-rate-limit,
  devlink-radering, Stripe, villkor/GDPR): se `LAUNCH.md`.

## 8. Ärlig helhetsbild

Utmärkta ben, halva kroppen. Klar kurs av verkligt värde, distinkt varumärke, en
ovanligt vass och försvarbar produkttes, och en testad deterministisk rygg för
killer-featuren. Det som saknas är det levande dataflödet som gör visionen till en
körande tjänst, plus några härdningspunkter. En spak flyttar betyget: välj datakällan
och skeppa Fas 2 på ett riktigt innehav.

## 9. Dokumentkarta

- **Denna fil** — aktuell paketöversikt (master).
- `docs/superpowers/plans/2026-07-11-portfoljforsakring-pipeline.md` — byggplanen
  (datamodell, motor, tes-tidslinjen som north star, faser).
- `LAUNCH.md` — prioriterad go-live-checklista (P0/P1/P2, ägare).
- `CLAUDE.md` — teknisk status och regler för framtida sessioner.
- `motor/vigilans/` — byggd rygg: tripwire-eval, brief-build, timeline-build,
  lektionskarta, exempelunderlag, tester.
- `supabase/migrations/20260711120000_vigilans.sql` — datamodellen (skiss).
- `docs/ventures/2026-07-02-final-boss-produktpaket.md` — tidigare masterdoc (historik).
- `docs/ventures/2026-07-06-value-proposition.md` — delbar one-pager (extern).
