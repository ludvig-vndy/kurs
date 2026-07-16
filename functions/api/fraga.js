/* functions/api/fraga.js  -  Fraga-assistenten (Claude), server-side.

   Nyckeln (ANTHROPIC_API_KEY) lever bara har pa edgen, aldrig i klienten.
   Sätt den med:  wrangler pages secret put ANTHROPIC_API_KEY --project-name kurs
   (samt --env preview for previewmiljon).

   Flode: klienten skickar { question, token } dar token ar anvandarens
   Supabase-access-token. Vi verifierar token -> user, hamtar ANVANDARENS egna
   innehav (server-side, filtrerat pa user_id), och later Claude svara med
   innehavet som kontext. Ingen inloggning -> svarar anda pa kursfragor. */

import { secureJson as json } from "./_lib.js";

const FALLBACK_URL = "https://xpxghvxrckpzbbkjmtcw.supabase.co";
// Haiku: Fraga ar kort, interaktivt Q&A dar innehavet redan ges som kontext,
// sa snabbhet + kostnad vinner over tungt resonemang. Sonnet sparas till den
// tunga dokument-/rapportanalysen (Rapportkollen) dar noggrannhet ar kritisk.
const MODEL = "claude-haiku-4-5-20251001";

async function getUser(base, secret, token) {
  if (!token) return null;
  try {
    const r = await fetch(base + "/auth/v1/user", {
      headers: { apikey: secret, Authorization: "Bearer " + token },
    });
    if (!r.ok) return null;
    const u = await r.json();
    return u && u.id ? u : null;
  } catch (e) { return null; }
}

async function getHoldings(base, secret, uid) {
  try {
    const r = await fetch(
      base + "/rest/v1/holdings?user_id=eq." + encodeURIComponent(uid) +
      "&select=name,ticker,quantity,gav,relation",
      { headers: { apikey: secret, Authorization: "Bearer " + secret } }
    );
    if (!r.ok) return [];
    const rows = await r.json();
    return Array.isArray(rows) ? rows : [];
  } catch (e) { return []; }
}

/* Server-side rate limit (KV-bindningen RL, se wrangler.toml). Varje anrop
   kostar riktiga pengar hos Anthropic; klient-klampen i sidan stoppar inga
   skript. Per IP: 10/minut och 60/dygn. KV ar inte atomiskt, men grov
   fonsterrakning racker som kostnadsskydd. Utan bindning: slapp igenom. */
async function rateLimited(env, request) {
  const kv = env.RL;
  if (!kv) return null;
  const ip = request.headers.get("CF-Connecting-IP") || "okand";
  const now = Date.now();
  const windows = [
    { key: "m:" + ip + ":" + Math.floor(now / 60e3), max: 10, ttl: 120 },
    { key: "d:" + ip + ":" + Math.floor(now / 864e5), max: 60, ttl: 90000 },
  ];
  for (const w of windows) {
    let n = 0;
    try { n = parseInt((await kv.get(w.key)) || "0", 10) || 0; } catch (e) { return null; }
    if (n >= w.max) {
      return w.max === 10
        ? "Många frågor på kort tid. Vänta en minut, så öppnar det igen."
        : "Du har nått dagens gräns för frågor. Den återställs i morgon.";
    }
    try { await kv.put(w.key, String(n + 1), { expirationTtl: w.ttl }); } catch (e) { /* ok */ }
  }
  return null;
}

export async function onRequestPost(context) {
  const { request, env } = context;
  const apiKey = env.ANTHROPIC_API_KEY;
  const secret = env.SUPABASE_SECRET_KEY;
  const base = env.SUPABASE_URL || FALLBACK_URL;

  const limited = await rateLimited(env, request);
  if (limited) return json({ error: limited }, 429);

  if (!apiKey) return json({ error: "AI ej konfigurerad (saknar ANTHROPIC_API_KEY)." }, 501);

  let question = "", token = "";
  try {
    const body = await request.json();
    question = String(body.question || "").trim();
    token = String(body.token || "").trim();
  } catch (e) { /* tom */ }
  if (!question) return json({ error: "Tom fraga." }, 400);
  if (question.length > 1000) return json({ error: "For lang fraga." }, 400);

  // Anvandaren + innehav (om inloggad). RLS-oberoende: vi filtrerar sjalva pa uid.
  let holdings = [];
  if (secret && token) {
    const user = await getUser(base, secret, token);
    if (user) holdings = await getHoldings(base, secret, user.id);
  }
  const holdingsText = holdings.length
    ? holdings.map(function (h) {
        return "- " + (h.name || "?") + (h.ticker ? " (" + h.ticker + ")" : "") +
          ", antal " + (h.quantity != null ? h.quantity : "?") +
          ", GAV " + (h.gav != null ? h.gav : "?") +
          ", relation " + (h.relation || "ager");
      }).join("\n")
    : "Inga innehav uppladdade an.";

  const system =
    "Du ar Delagarens assistent, en lugn och saklig hjalp for en privatinvesterare i en kurs om fundamental aktieanalys.\n\n" +
    "Regler:\n" +
    "- Svara pa svenska, kortfattat och konkret.\n" +
    "- Svara BARA pa fragor om anvandarens egna innehav och om kursens innehall (fundamental aktieanalys). Avboj vanligt annat.\n" +
    "- Anvand innehavet nedan nar fragan galler portfoljen. Hitta ALDRIG pa siffror som inte finns i datan. Saknas data, sag det rakt ut.\n" +
    "- Ge ALDRIG finansiell radgivning eller kop/salj-rekommendationer. Forklara mekanik och vad anvandaren sjalv kan titta pa. Besluten ar anvandarens.\n" +
    "- Inga tankstreck. Anvand komma, kolon eller punkt.\n\n" +
    "Anvandarens innehav:\n" + holdingsText;

  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 1024,
        system: system,
        messages: [{ role: "user", content: question }],
      }),
    });
    const d = await r.json().catch(function () { return {}; });
    if (!r.ok) return json({ error: (d.error && d.error.message) || "Modellen svarade inte." }, 502);
    const answer = (d.content || []).map(function (b) { return b.text || ""; }).join("").trim();
    return json({ answer: answer || "Jag har inget bra svar pa det just nu." });
  } catch (e) {
    return json({ error: "Kunde inte na modellen." }, 502);
  }
}
