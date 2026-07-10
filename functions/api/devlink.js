/* functions/api/devlink.js  —  TESTLÄGE, tas bort innan publik lansering.

   Genererar en riktig magic-link via Supabases service-nyckel (server-side,
   nyckeln lämnar aldrig edgen). Sidan inbjudan kan då visa en fungerande
   inloggningslänk direkt när man trycker skicka, utan att förlita sig på den
   rate-limitade gratis-mejlen.

   SÄKERHET: vem som helst som når endpointen kan generera en inloggningslänk
   för valfri mejladress (kontoövertagande). Under testet skyddas den enbart av
   lösenordsgrinden i functions/_middleware.js. MÅSTE stängas av / raderas innan
   tjänsten öppnas publikt, eller ersättas med inbjudnings-/betalningsgrind. */

const FALLBACK_URL = "https://xpxghvxrckpzbbkjmtcw.supabase.co";

function json(obj, status) {
  return new Response(JSON.stringify(obj), {
    status: status || 200,
    headers: { "Content-Type": "application/json" },
  });
}

export async function onRequestPost(context) {
  const { request, env } = context;
  const secret = env.SUPABASE_SECRET_KEY;
  const base = env.SUPABASE_URL || FALLBACK_URL;
  if (!secret) return json({ error: "devlink ej konfigurerad (saknar SUPABASE_SECRET_KEY)" }, 501);

  let email = "";
  try {
    const body = await request.json();
    email = String(body.email || "").trim();
  } catch (e) { /* tom body */ }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ error: "ogiltig mejladress" }, 400);

  const origin = new URL(request.url).origin;
  const redirect_to = origin + "/labs/dina-bolag-i-marginalen.html";

  const r = await fetch(base + "/auth/v1/admin/generate_link", {
    method: "POST",
    headers: { apikey: secret, Authorization: "Bearer " + secret, "Content-Type": "application/json" },
    body: JSON.stringify({ type: "magiclink", email, redirect_to }),
  });
  const d = await r.json().catch(() => ({}));
  const link = d.action_link || (d.properties && d.properties.action_link) || null;
  if (!link) return json({ error: d.msg || d.error_description || "kunde inte generera länk" }, 502);
  return json({ link });
}
