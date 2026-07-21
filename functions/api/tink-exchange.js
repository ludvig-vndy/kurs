/* functions/api/tink-exchange.js  —  Tink one-time-connect (POC, sandbox).

   Klienten (labs/koppla) skickar Tinks `code` (fran redirecten efter att
   anvandaren loggat in hos sin bank via Tink Link). Vi vaxlar den till en
   user access token SERVER-SIDE, sa client_secret aldrig ror klienten, och
   hamtar konton + investeringar. Returnerar RA datan sa vi ser shapen; ingen
   lagring an (det gors nar POC:en bevisat flodet).

   Konfig (Cloudflare-secret):  TINK_CLIENT_SECRET
     satts med:  npx wrangler pages secret put TINK_CLIENT_SECRET --project-name kurs
   client_id ar publik (Tink sager det sjalva) och far ligga i koden. */

import { secureJson as json } from "./_lib.js";

const CLIENT_ID = "b91c4551543a40dd8d3a830d7ac9e9cb"; // publik
const TOKEN_URL = "https://api.tink.com/api/v1/oauth/token";
const ACCOUNTS_URL = "https://api.tink.com/data/v2/accounts";
// Investments-endpointen bekraftas vid forsta sandbox-korningen; legacy-vagen
// nedan ar den dokumenterade. Byts latt nar vi ser riktig respons.
const INVEST_URL = "https://api.tink.com/api/v1/investments";

export async function onRequestPost(context) {
  const { request, env } = context;
  const secret = env.TINK_CLIENT_SECRET;
  if (!secret) return json({ error: "Tink ar inte konfigurerad an (saknar TINK_CLIENT_SECRET)." }, 501);

  let code = "";
  try { code = String((await request.json()).code || "").trim(); } catch (e) { /* tom */ }
  if (!code) return json({ error: "Saknar code." }, 400);

  // 1. code -> user access token
  const tr = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code, client_id: CLIENT_ID, client_secret: secret, grant_type: "authorization_code",
    }).toString(),
  });
  const tok = await tr.json().catch(() => ({}));
  if (!tr.ok || !tok.access_token) {
    return json({ error: "Token-vaxlingen misslyckades.", status: tr.status,
      detail: tok.errorMessage || tok.error_description || tok.error || null }, 502);
  }
  const auth = { Authorization: "Bearer " + tok.access_token };

  // 2. hamta konton + investeringar (best-effort, POC: visa ra shape)
  const [accounts, investments] = await Promise.all([
    fetch(ACCOUNTS_URL, { headers: auth }).then((r) => r.json()).catch(() => ({ _fel: "accounts" })),
    fetch(INVEST_URL, { headers: auth }).then((r) => r.json()).catch(() => ({ _fel: "investments" })),
  ]);

  return json({ ok: true, scope: tok.scope || null, accounts, investments });
}
