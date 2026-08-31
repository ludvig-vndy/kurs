# LAUNCH.md — go-live för Delägaren (betaltjänst)

Uppdaterad 2026-07-12. Prioriterad checklista för att gå från stängd test till att
ta publika pengar för den **fullständiga produkten** (kurs + vaksamhet).

**Läget nu:** kursen är klar och live. Vaksamheten (Ägarbrevet, trådar, tidslinjen)
har en testad deterministisk rygg men körs på exempeldata. Hela sajten ligger bakom
kontogrind. Priset (750/mån, 5000/år) gäller full produkt och får inte tas ut förrän
P0 nedan är sanna, annars säljer man ett löfte.

Ägare: **[Du]** = dashboard/externt (Cloudflare, Supabase, Strato, Börsdata, Stripe,
SMTP). **[Jag]** = kod jag gör på ditt ord. **[Beslut]** = val som ska tas.

---

## P0 — hårda blockerare (inga publika pengar innan dessa är sanna)

- [ ] **[Beslut+Du] Datakälla med kommersiell licens.** Retail-tiers (Börsdata Pro,
      FMP Starter) är privat bruk och får INTE visas för betalande kunder. Skarp tjänst
      kräver Börsdata Enterprise eller FMP:s Data Display-avtal. **Detta grindar allt
      annat i vaksamheten.** (Gratis och ok nu: FI-insynsregistret.)
- [ ] **[Jag+Du] Vaksamheten live på ETT riktigt innehav (Fas 2).** Rapportkollen ->
      holding_figures -> tripwire-eval -> briefs/tidslinje, på skarp data. Utan detta är
      flaggskeppet en demo och premiumpriset oärligt. Kräver datakällan ovan.
- [ ] **[Du] Egen SMTP** (Resend e.dyl., verifierad avsändardomän). Mejlen når fram, och
      det låser upp kodfältet (kräver `{{ .Token }}` i mallen). Flippa sen
      `CODE_LOGIN_ENABLED = true` i `logga-in.astro` **[Jag]**.
- [ ] **[Du] Supabase Site URL + Redirect URLs** -> skarpa domänen (`https://DOMÄN/**`),
      inte trunk-previewen. Annars går magic-länkarna fel. (Login small nyligen; detta
      är samma familj av fel.)
- [ ] **[Du] Domän kopplad:** ny zon i Cloudflare + custom domain på Pages-projektet
      `kurs`. Sen **[Jag]** uppdaterar `KURS_BAS` i `motor/tokens.mjs` + canonical/OG.
- [ ] **[Du] Secrets i Cloudflare** för prod (och preview): `SUPABASE_SECRET_KEY`,
      `ANTHROPIC_API_KEY`. Aldrig i klientkod.
- [x] **Server-side rate limiting på `functions/api/fraga.js`** (2026-07-14): KV-bunden
      (wrangler.toml, namespace fraga-rl), per IP 10/min + 60/dygn, 429 med vänlig text.
      Verifierat live. Utan bindning släpper limitern igenom (aldrig SPOF).
- [ ] **[Du] Stäng av publik signup i Supabase** (Authentication -> Sign In / Providers
      -> "Allow new users to sign up" AV). Annars kan klienten self-registrera med den
      publika publishable-nyckeln, helt förbi inbjudan = full åtkomst. **KRITISKT:** utan
      detta finns en väg förbi inbjudningsgrinden oavsett hur tät den är.
- [x] **`/api/devlink` härdad till inbjudnings-inlösen** (2026-07-12): kräver en giltig,
      pending, engångs-token, mejlbindning om `invites.email` är satt, och skapar kontot
      server-side. Inte längre en öppen bakdörr (verifierat: mejl utan token -> 403). Kan
      behållas som onboarding eller döpas om till `/api/accept-invite`.
- [ ] **[Du] Betalning, nycklarna:** koden är skaffoldad (2026-07-14): `/api/stripe-checkout`
      (session per plan ar/manad/kurs, kräver inloggning) + `/api/stripe-webhook`
      (signaturverifierad, skriver `subscriptions.status=active` -> triggar 2 inbjudningar)
      + prissidan `/medlemskap` (utkast, bakom grinden). Kvar hos dig: Stripe-konto,
      skapa priserna, sätt secrets `STRIPE_SECRET_KEY`, `STRIPE_PRICE_AR`,
      `STRIPE_PRICE_MANAD`, `STRIPE_PRICE_KURS`, `STRIPE_WEBHOOK_SECRET`, och registrera
      webhooken (https://DOMÄN/api/stripe-webhook) i Stripes dashboard.
- [ ] **[Du/Jur] Villkor + integritetspolicy (GDPR).** Ni lagrar innehav = känsliga
      personuppgifter, och tar betalt. Villkor, dataskydd och ansvarsfriskrivning
      ("aldrig köp/säljråd") måste finnas innan publik betalning.

- [x] **[Du] Applicera `supabase/migrations/20260830150000_tes.sql`** (2026-08-31): körd och verifierad, tabellen finns, RLS-policyn släpper igenom en skrivning som användaren, och Fråga läser tesen med rätt attribution ("du skrev själv") utan att ge omdöme. Ursprunglig text: (SQL-editorn räcker,
      en tabell och en policy). Utan den finns tesfältet i koden men inte i databasen:
      rutan syns på innehavssidan och sparknappen svarar att fältet inte är påslaget.
      Facitlistan (`npm run prova:fraga`) hoppar över sina två tesfall tills den är körd,
      och säger det rakt ut. **[Jag]** deployar när du säger till att den är körd.
- [ ] **[Du] Applicera `supabase/migrations/20260716000000_sakerhet-invites.sql`** på
      live-DB (`supabase db push` eller SQL-editor) OCH deploya klientändringen som
      hör ihop (accept_invite utan p_user, se migrationens not). Härdar två audit-fynd:
      accept_invite litade på klientstyrt user-id (spoofing av annans invited_by), och
      inbjudningar utan utgång (permanenta bakdörrar). **[Jag]** gör klientändringen när
      du säger till att migrationen är körd (annars bryts signaturen i prod).
- [ ] **[Beslut] Mejlbind inbjudningar** så devlink inte låter en token-innehavare skapa
      konto åt en godtycklig NY mejl (utfärdaren anger mottagarens mejl; devlink kräver
      match). Befintlig-konto-övertagandet är redan stängt **[Jag, 2026-07-15]**, men
      denna halva kvarstår tills invite-UI:t ber om mottagarmejl. Bäst löst ihop med
      att länken skickas via mejl (kräver SMTP) i stället för i svarskroppen.
- [ ] **[Beslut] Grinda betalda ytor på subscription-status, inte bara giltig session.**
      Idag släpper kontogrinden in varje inloggat konto; en inbjuden får hela produkten
      utan att betala. Är det avsikten i betan (inbjudan == gratis access) räcker en rad
      i LAUNCH; ska betalning krävas behöver middleware slå upp subscriptions.

- [x] **Facitlista för Fråga** (2026-08-30): `npm run prova:fraga` kör riktiga frågor
      mot deployad endpoint och prövar mekaniska krav (står talet där, blockerades
      svaret, avböjde den). Löftet "inga siffror tagna ur röven" är det produkten
      säljs på, och det behöver ett skyddsnät som fångar om det tyst slutar gälla.
      Bevisad mot en äldre deploy: burn rate-fallen faller där, allt annat står.
      Kostar under en krona per körning, ingår därför inte i `npm run check`.

## P1 — bör vara på plats kort efter (eller före, om enkelt)

- [ ] **[Jag] Positioneringsvakterna i all copy:** försäkring som metafor aldrig löfte,
      ingen låtsad precision, källa på varje tal. (Redan låst i planen, ska genomsyra UI.)
- [ ] **[Du] 2 till 3 bevisberättelser ur betan** ("det fångade X åt mig") innan
      premiumpriset marknadsförs. Det är det som bär 5000/år.
- [ ] **[Jag] Prisnivåer + prissida:** Kursen (ingång) mot Delägaren (full). Låter er ta
      betalt ärligt nu för det som är klart, med upsell när vaksamheten är live.
- [ ] **[Jag] Utdelnings-UI för inbjudningar** ("Dina inbjudningar", kopiera länk).
      Backend finns (kvot 2/medlem), frontend saknas.
- [ ] **[Du] Fel- och kostnadsövervakning** (Cloudflare-analytics + larm på
      Anthropic-spend).

## P2 — nice-to-have, efter launch

- [ ] Ljudutgåvan (TTS) av Ägarbrevet.
- [ ] Filings/kallelse-feed (utöver manuell inklistring) för emissionsmandat-vakten.
- [ ] Push-notiser (dödmansgreppet); e-post räcker i v1.
- [ ] Tidslinjen och beteendespåret på användarens hela portfölj (Fas 3 och 4).

---

## Motparten, pilotgrind (tidsbegränsad)

- [ ] **Ta bort pilotinloggningen innan Motparten öppnas** (P0 för den kursen).
      `functions/api/pilot-login.js` släpper in en kort namnlista genom att de bara
      skriver sin mejladress. Den som känner till en adress i listan kommer alltså in.

      Inhägnaden, så att beslutet kan fattas på rätt grunder: den fungerar bara på
      motparten-värden (404 på Marginalen), den sätter en egen HMAC-signerad cookie
      och inte en Supabase-session, den skapar inga konton, och den öppnar ingenting
      på kurs-7m8. Verifierat i produktion 2026-08-29: pilotcookien mot
      `kurs-7m8.pages.dev/fokus` ger omdirigering till inloggningen.

      Det som ska bort när kursen öppnas: `functions/api/pilot-login.js`,
      `src/pages/pilot.astro`, `PILOT_SECRET` på Pages-projektet `motparten`, samt
      `verifieraPilot` och `/pilot` i `functions/_middleware.js`. Undantaget i
      Broadsheets klientgrind kan då också tas bort.

      Läs det här först: sedan 2026-08-29 är kurserna åtskilda i middlewaren, och
      på motparten-värden finns ingen annan väg in än pilotcookien. Delägarens
      Supabase-JWT släpper inte in där. Att bara radera piloten stänger alltså
      kursen helt. Den ska bytas mot Motpartens egen inloggning i samma ändring.
      Att i stället låta JWT:n ta över vore att slå ihop produkterna igen, vilket
      är precis det beslutet gick ut på att undvika.

- [ ] **Värdera korpusexfiltration innan Säljcoachen öppnas för betalande kunder.**
      Coachen får full lektionstext i kontexten och är instruerad att inte återge den
      ordagrant. Det är ett partiellt skydd, inte en åtkomstkontroll: en systemprompt
      stoppar inte en legitim användare som metodiskt ber om en sammanfattning i taget.
      Taket på 40 frågor per dygn bromsar hastigheten, inte metoden. Under piloten är
      hotmodellen två namngivna personer, vilket gör risken acceptabel. Med tusentals
      betalande användare är den det inte nödvändigtvis.

      Punkten är avklarad när ett beslut är fattat och skrivet, inte när någon har
      "sett över" saken. Alternativen är minst: acceptera risken uttryckligen, korta ned
      materialet som skickas per fråga, eller acceptera att kursens text i praktiken är
      läsbar för den som betalar för en månad.

- [ ] **Kunduppgifter till Anthropic.** Säljcoachen kommer att få riktiga kundnamn och
      affärsdata i fritext, eftersom det är så folk beskriver ett möte. Gränssnittet ber
      användaren avstå, men en uppmaning är ingen behandlingsgrund. Avgör före lansering
      vad som gäller: databehandlaravtal, vad som loggas, och hur länge.

- [ ] **Rättigheter per kurs**, innan Motparten kan säljas separat. Varken Stripe
      eller Supabase vet i dag vilken kurs ett köp gäller. Skiljelinjen på värdnamn
      räcker för en pilot, inte för två betalande produkter. Eget arbete, egen spec.

## Rekommenderad sekvens

1. **Datakälla-beslut** (P0), allt hänger på det.
2. **Domän + Supabase-redirect + SMTP + secrets** (P0 infra, kan gå parallellt med 1).
3. **Fas 2 live på ett innehav** (P0 produkt), när datakällan är vald.
4. **Stripe + villkor/GDPR + prissida** (P0/P1 kommersiellt).
5. **Radera devlink** (P0, allra sist före öppning).
6. **Bevisberättelser** samlas under betan parallellt, sätt premiumpriset först då.

## Redan gjort

- Kontogrind ersätter sajtlösenordet: middleware verifierar Supabase-JWT (ES256, JWKS)
  server-side; publika undantag bara landning/logga-in/inbjudan/statik/api.
- supabase-js självvärd (`/vendor/supabase-js-2.110.2.min.js`), ingen CDN som kan
  blockeras eller SRI-driva; inloggningen väntar in klienten.
- `sendMagicLink` säker som standard (skapar konto endast vid `createUser: true`).
- Inbjudningsgrind verifierar token server-side (`invite-check.js`), RLS isolerar rader.
- Vaksamhetens rygg byggd och testad offline: motor, brief-build, timeline-build,
  datamodell (migration), kurskarta. 46 tester gröna.
- **Säkerhetsheaders (2026-07-15):** `public/_headers` sätter CSP (default-src 'self',
  script/style 'self'+inline, font/style mot Google Fonts, connect mot Supabase +
  Supabase-wss), `X-Frame-Options: DENY`, `frame-ancestors 'none'`,
  `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `HSTS` (1 år),
  `Permissions-Policy` (kamera/mic/geo av). Verifierat live på `/` + `/logga-in`:
  headers närvarande, noll CSP-violations, fonter och supabase-js laddar. Not:
  `script-src` tillåter `'unsafe-inline'` (sajten kör inline-skript överallt) så CSP:n
  skyddar mot injicerade *externa* skript och clickjacking, inte mot inline-XSS, det
  senare bärs av att all rendering redan escapar. Nonce-baserad CSP kräver ombyggnad
  av alla labs-mockar, uppskjutet tills de blir riktiga routes.
- **JWT härdad med aud/iss (2026-07-15):** middleware kräver nu `aud === 'authenticated'`
  och `iss === <vårt Supabase-projekt>` utöver alg-pinning (ES256) och signaturkoll, så
  en giltigt signerad token från ett annat projekt eller en anon/service-token inte
  släpps in. Verifierat: `/hem` utan cookie -> 302 logga-in, medlems-JSON grindad.
- **Adversariell multi-agent-audit körd (2026-07-15):** sju granskare + skeptisk
  verifiering per fynd (18 bekräftade, 4 falsklarm). Tre åtgärdade + deployade direkt:
  (1) **CRITICAL** encoded-slash (`%2f`) kringgick `/labs/data/`-grinden och läckte all
  medlems-JSON oautentiserat (verifierat live); fixat med path-normalisering (decode +
  gemener + multi-encoding) före alla grindbeslut. (2) **HIGH** XSS i `/verktyg`:
  bolagsnamn interpolerades oescapat i innerHTML och kunde komma från en delad
  analys-JSON; fixat med esc() vid källan. (3) **CRITICAL(halva)** devlink mintade
  inloggningslänk för befintligt konto = övertagande; stängt (vägrar 409 om kontot
  finns). Kvarvarande fynd: se P0-raderna ovan (invite-migration, mejlbindning,
  subscription-gating) samt P1/P2. Rotera `.env`-nycklarna (låg, lokal disk).
