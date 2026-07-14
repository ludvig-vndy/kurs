/* functions/api/stripe-webhook.js  —  tar emot Stripes webhookar.

   Verifierar signaturen (Stripe-Signature: t=...,v1=...) med HMAC-SHA256 over
   "t.rabody" innan nagot rors. Vid checkout.session.completed skrivs
   subscriptions-raden (status=active) for user.id ur client_reference_id,
   vilket via triggern grant_invites_on_active ger medlemmen sina 2
   inbjudningar. Vid subscription updated/deleted mappas status.

   Konfig: STRIPE_WEBHOOK_SECRET (whsec_..., fran Stripes dashboard nar
   endpointen registreras: https://DOMAN/api/stripe-webhook).
   Plan: skrivs som "membership" (sub_plan-enum). Kurs-nivan behover ett eget
   enum-varde i en senare migration; tills dess aktiverar kurs-kopet ocksa
   membership. */

const FALLBACK_URL = "https://xpxghvxrckpzbbkjmtcw.supabase.co";

function respond(status) { return new Response(status === 200 ? "ok" : "nej", { status }); }

async function validSignature(secretRaw, header, payload) {
  try {
    const parts = Object.fromEntries(header.split(",").map((p) => p.split("=")));
    const t = parts.t, v1 = parts.v1;
    if (!t || !v1) return false;
    if (Math.abs(Date.now() / 1000 - Number(t)) > 300) return false; // äldre än 5 min
    const key = await crypto.subtle.importKey(
      "raw", new TextEncoder().encode(secretRaw),
      { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
    );
    const mac = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(t + "." + payload));
    const hex = [...new Uint8Array(mac)].map((b) => b.toString(16).padStart(2, "0")).join("");
    if (hex.length !== v1.length) return false;
    let diff = 0;
    for (let i = 0; i < hex.length; i++) diff |= hex.charCodeAt(i) ^ v1.charCodeAt(i);
    return diff === 0;
  } catch (e) { return false; }
}

const STATUS_MAP = {
  active: "active", trialing: "trialing", past_due: "past_due",
  canceled: "canceled", unpaid: "past_due", incomplete: "incomplete",
  incomplete_expired: "canceled",
};

export async function onRequestPost(context) {
  const { request, env } = context;
  const whsec = env.STRIPE_WEBHOOK_SECRET;
  const secret = env.SUPABASE_SECRET_KEY;
  const base = env.SUPABASE_URL || FALLBACK_URL;
  if (!whsec || !secret) return respond(501);

  const payload = await request.text();
  const sig = request.headers.get("Stripe-Signature") || "";
  if (!(await validSignature(whsec, sig, payload))) return respond(400);

  let event = null;
  try { event = JSON.parse(payload); } catch (e) { return respond(400); }
  const H = { apikey: secret, Authorization: "Bearer " + secret, "Content-Type": "application/json" };

  async function upsert(row) {
    await fetch(base + "/rest/v1/subscriptions?on_conflict=user_id,plan", {
      method: "POST",
      headers: Object.assign({ Prefer: "resolution=merge-duplicates" }, H),
      body: JSON.stringify(row),
    });
  }

  if (event.type === "checkout.session.completed") {
    const s = event.data.object || {};
    if (s.client_reference_id) {
      await upsert({
        user_id: s.client_reference_id,
        plan: "membership",
        status: "active",
        stripe_customer_id: s.customer || null,
        stripe_subscription_id: s.subscription || null,
        updated_at: new Date().toISOString(),
      });
    }
  } else if (event.type === "customer.subscription.updated" || event.type === "customer.subscription.deleted") {
    const sub = event.data.object || {};
    const status = event.type.endsWith("deleted") ? "canceled" : (STATUS_MAP[sub.status] || "incomplete");
    // Uppdatera raden via stripe_subscription_id (user_id okant i denna event).
    await fetch(base + "/rest/v1/subscriptions?stripe_subscription_id=eq." + encodeURIComponent(sub.id), {
      method: "PATCH", headers: H,
      body: JSON.stringify({ status, current_period_end: sub.current_period_end ? new Date(sub.current_period_end * 1000).toISOString() : null, updated_at: new Date().toISOString() }),
    });
  }
  // Ovriga event: kvittera tyst sa Stripe inte gor retry-storm.
  return respond(200);
}
