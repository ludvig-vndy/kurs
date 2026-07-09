# Kopplingsplan: motorn -> Rapportkollen (spår 2)

*2026-07-09. Hur `motor/` wiras till Rapportkollen-ytan, steg för steg. Delen som går utan API-nycklar är byggd (se sist); LLM-delen väntar på nycklar.*

## Två vägar, samma UI-kontrakt

Motorn har två ingångar som producerar samma sorts utdata (analys + siffror med citat + grind):

1. **Deterministisk väg (inga nycklar).** `motor/run.mjs`-adaptrarna (`extract*.mjs` + `compute*.mjs` + `narrate*.mjs`) kör på fasta källor: Norlux-fixturen (fiktiv) och **Lifco-fallkällan (verklig, användarverifierad)**. Narrationen är mallbaserad. Ny fil `motor/rapport-json.mjs` kör den vägen och skriver strukturerad JSON till `public/labs/data/rapport-<key>.json`. **Detta är byggt och wirat.**
2. **LLM-väg (kräver nycklar).** `motor/rapportkollen.mjs` tar en godtycklig rapport (MFN-länk, PDF, fil), extraherar med `extract-llm.mjs`, narrerar via `llm.mjs` (`anropa`, modell ur `MOTOR_MODELL`, default claude-haiku), och renderar HTML. Detta klarar *inklistrade, stökiga* rapporter. Kräver `OPENAI_API_KEY` / `ANTHROPIC_API_KEY`. **Skriven, väntar på nycklar.**

Båda går genom samma **noll-hallucinationsgrind** (`verify.mjs`): varje tal i texten måste matcha ett extraherat faktum eller en beräkning, annars blockeras texten. Grinden är släppkravet.

## Datakontrakt (JSON som ytan renderar)

`rapport-json.mjs` skriver:
```
{ bolag, period, verklig(bool), kalla, genererad,
  grind:{ok,antal}, eval:{ok,antal},
  verdikt, stycken[], siffror[{id,etikett,nu,fjol,enhet,forandring_pct,citat,kalla}], beraknat{} }
```
Ytan (Rapportkollen-mocken) hämtar `/labs/data/rapport-<key>.json` och renderar grind-banner + verdikt + stycken + sifferrad-med-citat. Samma kontrakt gäller för LLM-vägen, så UI:t behöver inte ändras när nycklarna kommer.

## Runtime-gränsen (viktig)

`motor/` är Node med fil-I/O och LLM-anrop. **Cloudflare Pages Functions kör på Workers-runtime, där kör Node-motorn inte direkt.** Två lägen:

- **Byggtid (nu):** kör `rapport-json.mjs` i ett prebuild-steg (eller manuellt) och committa JSON till `public/labs/data/`. Statiskt, gratis, inga nycklar. Bra för en kurerad bolagslista (t.ex. betapanelens innehav) och för demot.
- **On demand (för inklistrade rapporter):** behövs när användaren klistrar in en godtycklig rapport. Kräver en **Node-endpoint** (en liten separat tjänst: Fly.io/Render/en Node-container, eller Cloudflare Worker som proxার till en Node-funktion) som kör `rapportkollen.mjs`-vägen med nycklar och returnerar JSON. Pages-sidan `fetch`:ar den. Det är här nycklarna och en (billig) körkostnad kommer in.

## Stegplan

1. **Byggt:** `rapport-json.mjs` -> `public/labs/data/rapport-lifco.json` (verklig) + `rapport-norlux.json`. Rapportkollen-ytan hämtar och renderar dem som "riktig, grindad analys" bredvid exempeldatan. Bevisar motor -> UI utan nycklar.
2. **Prebuild-hook:** lägg `node motor/rapport-json.mjs lifco && node motor/rapport-json.mjs norlux` i ett `prebuild`-script så JSON alltid är färskt vid deploy. (Kan utökas till en bolagslista.)
3. **Nycklar in:** sätt `ANTHROPIC_API_KEY`/`OPENAI_API_KEY` (och ev. `MOTOR_MODELL`) som miljövariabler. Kör `rapportkollen.mjs` på 5 till 10 riktiga svenska rapporter, bygg facit-eval per rapport (mönstret finns i `fixtures/`). Noll hallucinerade tal = släppkrav.
4. **On-demand-endpoint:** liten Node-tjänst som kör LLM-vägen och returnerar samma JSON-kontrakt; Rapportkollen-ytan pekar sitt "klistra in"-flöde dit. Först här blir godtyckliga inklistrade rapporter riktiga.
5. **Konton + betalning:** eget designpass (Stripe + magic-link), gate:ar on-demand-endpointen. Separat spår.

## Vad som är sant i dag (efter detta pass)

- Motorn kör verklig Lifco-data (30/30 extraktion, 3/3 korskontroll, grind PASS) och den analysen visas i Rapportkollen-ytan, genererad av motorn, inte handskriven.
- Allt tal i den visade analysen bär ett citat ur källan och har passerat grinden.
- Inga nycklar behövdes för detta. Nästa lås som kräver dig: nycklar för godtyckliga inklistrade rapporter, och en Node-endpoint för on-demand.
