/* functions/api/stripe-checkout.js  —  skapar en Stripe Checkout-session.

   POST { plan: "ar" | "manad" | "kurs", token }  ->  { url }

   token ar anvandarens Supabase-access-token: bara inloggade medlemmar kan
   inleda ett kop, och user.id foljer med som client_reference_id sa webhooken
   (stripe-webhook.js) kan aktivera ratt konto.

   Konfig (Cloudflare-secrets, satts med `wrangler pages secret put ...`):
     STRIPE_SECRET_KEY   sk_live_... / sk_test_...
     STRIPE_PRICE_AR     price-id, Delagaren 5000 kr/ar
     STRIPE_PRICE_MANAD  price-id, Delagaren 795 kr/man
     STRIPE_PRICE_KURS   price-id, Kursen (ingangsniva, arlig)
   Utan konfig: 501 (samma monster som ovriga funktioner). */

const FALLBACK_URL = "https://xpxghvxrckpzbbkjmtcw.supabase.co";

function json(obj, status) {
  return new Response(JSON.stringify(obj), {
    status: status || 200,
    headers: { "Content-Type": "application/json" },
  });
}

export async function onRequestPost(context) {
  const { request, env } = context;
  const sk = env.STRIPE_SECRET_KEY;
  if (!sk) return json({ error: "Betalning är inte öppnad än." }, 501);

  let plan = "", token = "";
  try {
    const body = await request.json();
    plan = String(body.plan || "").trim();
    token = String(body.token || "").trim();
  } catch (e) { /* tom */ }

  const PRICES = { ar: env.STRIPE_PRICE_AR, manad: env.STRIPE_PRICE_MANAD, kurs: env.STRIPE_PRICE_KURS };
  const price = PRICES[plan];
  if (!price) return json({ error: "Okänd plan." }, 400);

  // Verifiera medlemmen (samma monster som fraga.js).
  const base = env.SUPABASE_URL || FALLBACK_URL;
  const secret = env.SUPABASE_SECRET_KEY;
  if (!secret || !token) return json({ error: "Logga in först." }, 401);
  let user = null;
  try {
    const r = await fetch(base + "/auth/v1/user", {
      headers: { apikey: secret, Authorization: "Bearer " + token },
    });
    if (r.ok) user = await r.json();
  } catch (e) { /* nedan */ }
  if (!user || !user.id) return json({ error: "Logga in först." }, 401);

  const origin = new URL(request.url).origin;
  const form = new URLSearchParams({
    mode: "subscription",
    "line_items[0][price]": price,
    "line_items[0][quantity]": "1",
    client_reference_id: user.id,
    customer_email: user.email || "",
    success_url: origin + "/hem?betalning=klar",
    cancel_url: origin + "/medlemskap?betalning=avbruten",
  });

  const r = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: {
      Authorization: "Bearer " + sk,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: form.toString(),
  });
  const d = await r.json().catch(() => ({}));
  if (!r.ok || !d.url) return json({ error: (d.error && d.error.message) || "Kunde inte starta betalningen." }, 502);
  return json({ url: d.url });
}
