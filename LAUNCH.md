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
- [ ] **[Jag+Du] Server-side rate limiting på `functions/api/fraga.js`** (per IP +
      tokenbudget). Varje anrop kostar pengar; klient-klampen stoppar inte bots. Kräver
      en KV-binding **[Du]** eller Cloudflare WAF-rate-limit-regel; sen logiken **[Jag]**.
- [ ] **[Du] Stäng av publik signup i Supabase** (Authentication -> Sign In / Providers
      -> "Allow new users to sign up" AV). Annars kan klienten self-registrera med den
      publika publishable-nyckeln, helt förbi inbjudan = full åtkomst. **KRITISKT:** utan
      detta finns en väg förbi inbjudningsgrinden oavsett hur tät den är.
- [x] **`/api/devlink` härdad till inbjudnings-inlösen** (2026-07-12): kräver en giltig,
      pending, engångs-token, mejlbindning om `invites.email` är satt, och skapar kontot
      server-side. Inte längre en öppen bakdörr (verifierat: mejl utan token -> 403). Kan
      behållas som onboarding eller döpas om till `/api/accept-invite`.
- [ ] **[Du+Jag] Betalning:** Stripe checkout + webhook -> `subscriptions.status=active`
      (triggar redan 2 inbjudningar i schemat). Kod **[Jag]**, konto/nycklar **[Du]**.
- [ ] **[Du/Jur] Villkor + integritetspolicy (GDPR).** Ni lagrar innehav = känsliga
      personuppgifter, och tar betalt. Villkor, dataskydd och ansvarsfriskrivning
      ("aldrig köp/säljråd") måste finnas innan publik betalning.

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
