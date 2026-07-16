/* functions/api/devlink.js  —  inlösen av inbjudan (server-side).

   Skapar ett konto och en inloggningslänk BARA mot en giltig, pending,
   engångs-inbjudan. Utan token: inget konto. Detta ersätter den tidigare
   testbakdörren som mintade en länk för valfri mejl (kontoövertagande).

   Flöde:
     1. token + email in.
     2. Slå upp inbjudan (service-nyckel). Måste vara pending och inte utgången.
     3. Är inbjudan mejlbunden (invites.email satt) måste mejlen matcha.
     4. Konsumera inbjudan atomiskt (PATCH ... WHERE status=pending). Bara ett
        anrop vinner -> engångs, även under kapplöpning.
     5. Skapa kontot server-side (service-nyckel, funkar även med publik signup
        avstängd i Supabase).
     6. Generera magic-länk -> returneras.

   Publik signup MÅSTE vara avstängd i Supabase, annars finns en väg förbi denna
   grind (klienten kan self-registrera med publishable-nyckeln). Se LAUNCH.md. */

import { secureJson as json, rateLimited } from "./_lib.js";

const FALLBACK_URL = "https://xpxghvxrckpzbbkjmtcw.supabase.co";

export async function onRequestPost(context) {
  const { request, env } = context;
  const secret = env.SUPABASE_SECRET_KEY;
  const base = env.SUPABASE_URL || FALLBACK_URL;
  if (!secret) return json({ error: "ej konfigurerad (saknar SUPABASE_SECRET_KEY)" }, 501);

  // Oautentiserad service-nyckel-endpoint: takta per IP mot missbruk (konto-/
  // länkgenerering och token-sondering i skala).
  const limited = await rateLimited(env, request, "devlink", 12, 60);
  if (limited) return json({ error: limited }, 429);
  const H = { apikey: secret, Authorization: "Bearer " + secret, "Content-Type": "application/json" };

  let email = "", token = "";
  try {
    const body = await request.json();
    email = String(body.email || "").trim();
    token = String(body.token || "").trim();
  } catch (e) { /* tom body */ }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ error: "ogiltig mejladress" }, 400);
  if (!token) return json({ error: "En giltig inbjudan krävs." }, 403);

  // 1-3. Slå upp och validera inbjudan.
  const r1 = await fetch(
    base + "/rest/v1/invites?select=id,status,expires_at,email&token=eq." + encodeURIComponent(token),
    { headers: H }
  );
  const rows = await r1.json().catch(() => []);
  if (!Array.isArray(rows) || rows.length === 0) return json({ error: "Okänd inbjudan." }, 403);
  const inv = rows[0];
  if (inv.status !== "pending") return json({ error: "Inbjudan är redan använd." }, 403);
  if (inv.expires_at && new Date(inv.expires_at).getTime() < Date.now()) return json({ error: "Inbjudan har gått ut." }, 403);
  if (inv.email && String(inv.email).toLowerCase() !== email.toLowerCase()) {
    return json({ error: "Inbjudan gäller en annan mejladress." }, 403);
  }

  // 4. Konsumera atomiskt: bara ett anrop vinner (WHERE status=pending).
  const r2 = await fetch(
    base + "/rest/v1/invites?id=eq." + encodeURIComponent(inv.id) + "&status=eq.pending",
    {
      method: "PATCH",
      headers: Object.assign({ Prefer: "return=representation" }, H),
      body: JSON.stringify({ status: "accepted", accepted_email: email, accepted_at: new Date().toISOString() }),
    }
  );
  const consumed = await r2.json().catch(() => []);
  if (!Array.isArray(consumed) || consumed.length === 0) return json({ error: "Inbjudan är redan använd." }, 403);

  // 5. Skapa kontot server-side. VIKTIGT: en inbjudan loser bara in NYA konton.
  //    Om mejlen redan har ett konto (422/409) far vi INTE minta en inloggningslank
  //    for det, annars vore detta en overtagande-primitiv: vem som helst med en
  //    (icke-mejlbunden) token kunde ange en befintlig medlems mejl och fa en lank
  //    rakt in i deras konto. Aterinloggning sker via /logga-in, aldrig hit.
  const createRes = await fetch(base + "/auth/v1/admin/users", {
    method: "POST", headers: H,
    body: JSON.stringify({ email, email_confirm: true }),
  }).catch(() => null);
  if (!createRes) return json({ error: "Kunde inte skapa kontot." }, 502);
  if (createRes.status === 409 || createRes.status === 422) {
    return json({ error: "Ett konto finns redan for den har mejladressen. Logga in i stallet." }, 409);
  }
  if (!createRes.ok) return json({ error: "Kunde inte skapa kontot." }, 502);

  // 6. Generera inloggningslänk (landar på /logga-in som slutför sessionen).
  const origin = new URL(request.url).origin;
  const r3 = await fetch(base + "/auth/v1/admin/generate_link", {
    method: "POST", headers: H,
    body: JSON.stringify({ type: "magiclink", email, redirect_to: origin + "/logga-in" }),
  });
  const d = await r3.json().catch(() => ({}));
  const link = d.action_link || (d.properties && d.properties.action_link) || null;
  if (!link) return json({ error: d.msg || d.error_description || "Kunde inte generera länk." }, 502);
  return json({ link });
}
