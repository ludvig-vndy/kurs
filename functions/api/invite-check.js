/* functions/api/invite-check.js  —  validerar en inbjudnings-token.

   invites-tabellen är RLS-skyddad så en oinloggad klient inte kan läsa den.
   Den här endpointen kontrollerar token server-side med service-nyckeln och
   svarar bara med ett ja/nej + skäl, aldrig med tabelldata. */

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
  if (!secret) return json({ valid: false, reason: "config" }, 501);

  let token = "";
  try { token = String((await request.json()).token || "").trim(); } catch (e) { /* tom */ }
  if (!token) return json({ valid: false, reason: "saknas" });

  const r = await fetch(
    base + "/rest/v1/invites?select=id,status,expires_at&token=eq." + encodeURIComponent(token),
    { headers: { apikey: secret, Authorization: "Bearer " + secret } }
  );
  const rows = await r.json().catch(() => []);
  if (!Array.isArray(rows) || rows.length === 0) return json({ valid: false, reason: "okand" });

  const inv = rows[0];
  if (inv.status !== "pending") return json({ valid: false, reason: "anvand" });
  if (inv.expires_at && new Date(inv.expires_at).getTime() < Date.now()) {
    return json({ valid: false, reason: "utgangen" });
  }
  return json({ valid: true });
}
