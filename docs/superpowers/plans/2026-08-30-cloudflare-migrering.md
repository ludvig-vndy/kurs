# Flytt av Cloudflare-resurser till ludvig-kontot

**Datum:** 2026-08-30
**Status:** allt flyttat och verifierat 2026-08-31. Kvar: byta piloterna till de nya adresserna, sedan radera det gamla.
**Från:** vndy-kontot (`a525ec472526e7bb5e054e8f88922c50`)
**Till:** ludvig-kontot

Cloudflare har ingen överföringsfunktion för Pages-projekt, Workers eller KV-namespaces.
Allt återskapas i målkontot och raderas i källkontot.

---

## Beslut

| Sak | Nu | Efter |
| --- | --- | --- |
| Aktiekursen, Pages-projekt | `kurs` | `aktiekurs` |
| Aktiekursens URL | kurs-7m8.pages.dev | aktiekurs.pages.dev |
| Säljkursen, Pages-projekt | `motparten` | `motparten` (samma namn) |
| Säljkursens URL | motparten.pages.dev | motparten.pages.dev (oförändrad) |

`aktiekurs` är ett kodnamn. Tjänsten heter Delägaren och ska så småningom ligga på en egen
domän, och då spelar pages.dev-namnet ingen roll. Pages-projekt går inte att döpa om, men
det slutar spela roll så fort en domän ligger framför.

`aktiekurs.pages.dev` var ledigt vid kontroll 2026-08-30 (svarade som ett påhittat namn,
till skillnad från motparten.pages.dev som svarade 302).

## Vad som flyttas

| Resurs | Detalj | Data att rädda |
| --- | --- | --- |
| Pages `kurs` | 85 fokus-sidor plus resten | nej, byggs om ur repot |
| Pages `motparten` | säljkursen | nej, byggs om ur repot |
| KV `fraga-rl` | `33773ae0f9864d78853252d6cab09031` | nej, bara strypningsräknare |
| KV `upptack-data` | `f155742e0cb14bb390fced9aea5ca641` | **JA, måste kopieras** (ändrat 2026-08-31) |
| Worker `upptack-cron` | daglig cron 05:00 UTC | nej, kod i `worker-upptack/` |

**Rättat 2026-08-31:** `upptack-data` är inte längre tomt. Det bär nu Frågas dokumentarkiv,
femton bolag om cirka 300 kB vardera under nycklarna `arkiv:<bolagsid>` plus `arkiv:index`,
och ett morgonbrev per användare under `brev:<user_id>`. Arkivet innehåller extraherade
fakta ur rapport-PDF:erna, bland annat likvida medel per period, som kostat modellanrop att
ta fram. Görs flytten på det gamla antagandet försvinner allt det, och Fråga är tillbaka på
noll dokument.

Nycklarna går att kopiera med `wrangler kv key list` följt av `get` och `put` mot det nya
namespacet, eller enklare: kör om `node motor/bygg-arkiv.mjs --fyll --fakta --kor` mot det
nya namespace-id:t. Det senare kostar modellanrop igen men ger färskare data.

Att workern `upptack-cron` inte verkar ha skrivit något är fortfarande en egen fråga, och
inget som hindrar flytten.

## Secrets som måste matas in på nytt

Ingen går att läsa tillbaka ur Cloudflare. Värdena hämtas från sin ursprungskälla.

| Secret | Projekt efter flytt | Källa |
| --- | --- | --- |
| `SUPABASE_SECRET_KEY` | `aktiekurs` | Supabase, projektinställningar |
| `ANTHROPIC_API_KEY` | `aktiekurs` och `motparten` | console.anthropic.com |
| `TINK_CLIENT_SECRET` | `aktiekurs` | Tinks konsol |
| `PILOT_SECRET` | `motparten` | valfri ny slumpsträng, se nedan |
| `REFRESH_TOKEN` | Worker `upptack-cron` | den tjänst workern hämtar från |

`PILOT_SECRET` kan bytas till ett nytt värde utan konsekvens. Det gör bara att befintliga
pilotcookies slutar gälla, och de två piloterna loggar in igen på `/pilot`.

**Sätt inte secrets via `wrangler pages secret put` genom Claude Code.** Kommandot frågar
efter värdet på en prompt, och `!`-kommandon här har ingen tangentbordsinmatning. Wrangler
tar då emot ett tomt värde och rapporterar ändå "Success", vilket hände 2026-08-29 och tog
en stund att felsöka. Använd Cloudflares gränssnitt eller en egen terminal.

## Ordningen

Aktiekursen kan flyttas utan avbrott eftersom `aktiekurs` är ett nytt, ledigt namn.
Motparten får ett kort glapp eftersom namnet måste frigöras först.

### Fas 1, i målkontot (inget avbrott någonstans)

- [ ] `npx wrangler login` mot ludvig-kontot, eller `CLOUDFLARE_API_TOKEN` satt per kommando
- [ ] Skapa KV-namespaces och anteckna de nya id:na:

```bash
npx wrangler kv namespace create fraga-rl
npx wrangler kv namespace create upptack-data
```

- [ ] Uppdatera `wrangler.toml`: `name = "aktiekurs"` och de två nya KV-id:na
- [ ] Uppdatera `worker-upptack/wrangler.toml` med det nya `upptack-data`-id:t
- [ ] Deploya aktiekursen:

```bash
npm run build
npx wrangler pages deploy dist --project-name=aktiekurs --branch=main
```

- [ ] Sätt `SUPABASE_SECRET_KEY`, `ANTHROPIC_API_KEY` och `TINK_CLIENT_SECRET` i
      gränssnittet, Production, och **deploya om** (Pages plockar upp secrets först vid
      nästa deployment)
- [ ] Lägg till aktiekursens nya URL i Supabases lista över tillåtna redirect-URL:er.
      **Ta inte bort den gamla än**, båda ska fungera under omställningen
- [ ] Kontrollera: `https://aktiekurs.pages.dev/` svarar, `/fokus` omdirigerar till
      `/logga-in`, och inloggning med magiclink fungerar hela vägen in
- [ ] Deploya workern och sätt dess secret:

```bash
cd worker-upptack && npx wrangler deploy
```

### Fas 2, motparten (kort glapp)

- [ ] Radera Pages-projektet `motparten` i **vndy-kontot** (gränssnittet, eller
      `npx wrangler pages project delete motparten` med det kontots inloggning)
- [ ] Skapa och deploya direkt i målkontot:

```bash
npx wrangler pages deploy dist --project-name=motparten --branch=main
```

- [ ] Kontrollera att `motparten.pages.dev` faktiskt hamnade på det nya projektet och inte
      fick en suffix. Blev det `motparten-xxx.pages.dev` har Cloudflare inte hunnit frigöra
      namnet: radera det nya projektet, vänta, försök igen
- [ ] Sätt `PILOT_SECRET` och `ANTHROPIC_API_KEY`, deploya om
- [ ] Lägg KV-bindningen `RL` på projektet (Settings, Functions, KV namespace bindings,
      Production) mot det nya `fraga-rl`-id:t
- [ ] Kontrollera: `/motparten` omdirigerar till `/pilot`, inloggning fungerar, och
      `/api/coach` ger 401 utan cookie i stället för 501

### Fas 3, städning

- [ ] Radera Pages-projektet `kurs` i vndy-kontot
- [ ] Radera KV-namespacen och workern i vndy-kontot
- [ ] Ta bort den gamla URL:en ur Supabases redirect-lista
- [ ] Uppdatera repot, se nedan

## Ställen i repot som nämner den gamla URL:en

Nio träffar. Ingen av dem är funktionell kod, det är dokumentation och kommentarer, så
inget slutar fungera om de missas. De ska ändå stämma.

| Fil | Vad |
| --- | --- |
| `README.md:8` | live-URL. **Innehåller dessutom det borttagna sajtlösenordet `kurs2026`**, som slutade gälla 2026-07-11. Rätta båda |
| `CLAUDE.md:10` | deploy-raden med båda projekten |
| `LAUNCH.md:104-105` | verifieringen av pilotcookiens räckvidd |
| `functions/api/pilot-login.js:7` | kommentar om att endpointen svarar 404 på fel värd |
| `docs/superpowers/specs/2026-08-22-motparten-saljkurs-design.md:313` | projektlistan |
| `docs/superpowers/plans/2026-08-29-motparten-pilot.md:1862` | verifieringssteg |
| `docs/superpowers/plans/2026-08-29-saljcoachen.md:2026-2027` | curl mot Marginalen i uppgift 12 |

Kontrollera samtidigt att inget i koden antar värdnamnet. `motpartenVard()` i
`functions/_middleware.js` matchar på att värdnamnet börjar med `motparten`, och
klientgrinden i `Broadsheet.astro` gör detsamma. Båda fungerar oförändrat så länge
säljkursen behåller sitt namn. Aktiekursen har inga värdnamnsantaganden alls.

## Efter flytten

Kontot är inte längre samma som det Börsdata-, Tink- och Stripe-integrationerna
registrerades mot. Cloudflare-flytten påverkar inte dem tekniskt, men kontrollera att
eventuella IP-lås eller callback-URL:er hos de tjänsterna pekar rätt.


---

## Utfall 2026-08-31

| Sak | Gammalt (VNDY) | Nytt (ludvig `fbfc68e2`) |
| --- | --- | --- |
| Aktiekursen | `kurs` / kurs-7m8.pages.dev | `aktiekurs` / aktiekurs.pages.dev |
| Säljkursen | `motparten` / motparten.pages.dev | `motparten-app` / motparten-app.pages.dev |
| KV `upptack-data` | `f155742e…` | `97d78256…`, 20 nycklar kopierade |
| KV `fraga-rl` | `33773ae0…` | `41b27b64…` |

Säljkursen fick ett nytt namn med flit: `motparten.pages.dev` går inte att återanvända
förrän det gamla projektet raderats, och att ta ned en produkt mitt i en pilot för en
vanity-adress är fel avvägning. Middlewarens `motpartenVard()` godkänner allt som börjar
med `motparten-`, så `motparten-app.pages.dev` känns igen utan kodändring.

**Deploykommandon efter flytten:**

```
npm run build
npx wrangler pages deploy dist --project-name=aktiekurs --branch=main
npx wrangler pages deploy dist --project-name=motparten-app --branch=main
```

`CLOUDFLARE_ACCOUNT_ID` ska vara `fbfc68e2efed9cbbe0dc0396f299e2c1` eller osatt.
`wrangler.toml` bär projektnamnet `aktiekurs` och KV-bindningarna; säljkursen deployas med
flaggan och får samma bindningar, vilket är ofarligt (den använder bara `RL`).

**PILOT_SECRET roterades.** Den gick inte att läsa tillbaka ur Cloudflare och fanns inte i
`.env`. En ny genererades, sattes på `motparten-app` och sparades i `.env` så den går att
återskapa nästa gång. Följden: befintliga pilotcookies slutar gälla och piloterna loggar in
på nytt med sin mejladress.

**Verifierat live:** aktiekursen svarar på Fråga med innehav, arkiv, källor och kodräknade
härledningar. Säljkursen passerar coachens tre konfigkontroller (`ANTHROPIC_API_KEY`,
`PILOT_SECRET`, `RL`) och stannar först på pilotinloggningen, vilket är avsett.

**Workern `upptack-cron`** är också flyttad. `worker-upptack/wrangler.toml` pekade redan på
det nya KV-id:t. Ny adress: `upptack-cron.cellar-api.workers.dev`, samma cron 05:00 UTC.
Provkörd manuellt: 12 bolag, 437 köp, 785 transaktioner skrivna till det nya namespacet.

`REFRESH_TOKEN` roterades av samma skäl som `PILOT_SECRET`: den går inte att läsa tillbaka
ur Cloudflare. Den gäller bara den manuella triggern (`?refresh=`), inte cron-körningen, och
är sparad i `.env`.

**Kvar, i den här ordningen:**

1. Lägg till de nya adresserna i Supabase Auth, Site URL och Redirect URLs, annars landar
   magic-länkarna på den gamla sajten.
2. Skicka de nya adresserna till piloterna. Piloterna på Motparten loggar in på nytt,
   eftersom `PILOT_SECRET` roterades.
3. Först därefter: radera VNDY:s `kurs`, `motparten` och den gamla `upptack-cron`. Den gamla
   workern kör fortfarande sin cron 05:00 mot det gamla namespacet, alltså dubbelt arbete
   utan mottagare.
