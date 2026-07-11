# LAUNCH.md — lanseringsblockerare för Delägaren (betaltjänst)

Måste vara avklarade innan tjänsten öppnas publikt. Uppdaterad 2026-07-10.

## Säkerhet (blockerare)

- [ ] **Radera testbakdörren `functions/api/devlink.js`.** Endpointen genererar en
      giltig inloggningslänk för *valfri* mejladress via service-nyckeln = kontoövertagande.
      Under test skyddas den enbart av sajtlösenordsgrinden. Ta bort:
      - `functions/api/devlink.js` (hela filen)
      - anropet i `public/labs/inbjudan-i-marginalen.html` (fetch till `/api/devlink`,
        länkboxen som visar länken, och dess CSS)
- [ ] **Byt sajtlösenordet** (`kurs2026` i `functions/_middleware.js` / `env.SITE_PASSWORD`)
      eller ta bort lösenordsgrinden helt om betal-/inbjudningsgrind ersätter den.
- [ ] **Secret-nyckeln enbart i Cloudflare-env**, aldrig i klientkod. Sätt för både
      production och preview: `wrangler pages secret put SUPABASE_SECRET_KEY --project-name kurs`.
- [ ] **Supabase Site URL + Redirect URLs** pekar på den skarpa domänen (inte trunk-previewen),
      annars går magic-länkarna fel.
- [ ] **Egen SMTP (t.ex. Resend, verifierad avsändardomän)** så mejl når riktiga mottagare
      utan den rate-limitade gratis-mejlen.
- [ ] **Fråga-AI (`functions/api/fraga.js`):** sätt `ANTHROPIC_API_KEY` som Cloudflare-secret
      (`wrangler pages secret put ANTHROPIC_API_KEY --project-name kurs`). **Server-side
      rate limiting saknas** (per user/IP/tokenbudget) — varje anrop kostar pengar, måste
      på plats innan publik öppning. Klient-klampen i fraga-sidan räcker inte mot bots.

## Redan härdat (2026-07-10)

- `sendMagicLink` är säker som standard: skapar konto endast vid uttryckligt
  `{ createUser: true }` (inbjudningsflödet, efter verifierad token).
- supabase-js är pinnad till exakt version med SRI (`@2.110.2/dist/umd/supabase.min.js`),
  ingen flytande major från CDN.
- Inbjudningsgrinden verifierar token server-side (`functions/api/invite-check.js`,
  secret-nyckel), RLS isolerar varje användares rader.

## Kvar i access-modellen (ej blockerare för stängd beta)

- Stripe checkout + webhook (`subscriptions.status = active` → 2 inbjudningar).
- "Dina inbjudningar"-vy.
- **Marknadsdatalicens (kommersiell) före publik lansering.** Retail-abonnemang
  (Börsdata Pro/Pro+, FMP Starter/Premium) är PRIVAT bruk och får INTE
  redistribueras/visas för betalande kunder. Skarp tjänst kräver ett kommersiellt
  avtal: Börsdata Enterprise (kontakta dem) eller FMP:s "Data Display and Licensing
  Agreement". Egen kostnads-/avtalspost. Gratis nu: FI-insynsregistret (publikt).
  För att bara BYGGA/testa nordisk fundamenta räcker Börsdata **Pro €25/mån** (Nordic API).
