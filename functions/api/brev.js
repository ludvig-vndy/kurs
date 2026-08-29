/* functions/api/brev.js  —  serverar det senaste dagsbrevet ur KV.

   Motorn (natt.mjs) skriver brev-latest.json och publicerar det till KV-nyckeln
   "brev-latest" (via motor/publicera-brev.mjs). Ägarbrevet-sidan läser det här
   och renderar händelsebrevet. Fältformen: { date, nr, checked, poster[], lugna[] }.

   Publik-ish: brevet handlar om publika bolagsnyheter, men innehåller vilka bolag
   som bevakas. Ligger bakom /api/ (kontogrindens undantag) men no-store så det inte
   fastnar i mellanlager. Per-användare-filtrering är en senare fråga.
*/
const KV_KEY = "brev-latest";

export async function onRequestGet(context) {
  const { env } = context;
  const H = {
    "Content-Type": "application/json; charset=utf-8",
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Cache-Control": "no-store",
  };
  if (!env.DATA) return new Response(JSON.stringify({ fel: "KV ej bunden." }), { status: 501, headers: H });
  const cur = await env.DATA.get(KV_KEY);
  if (!cur) return new Response(JSON.stringify({ fel: "Inget brev ännu." }), { status: 404, headers: H });
  return new Response(cur, { headers: H });
}
