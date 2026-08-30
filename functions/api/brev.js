/* functions/api/brev.js  —  serverar det senaste dagsbrevet ur KV.

   Motorn (natt.mjs) skriver brev-latest.json och publicerar det till KV-nyckeln
   "brev-latest" (via motor/publicera-brev.mjs). Ägarbrevet-sidan läser det här
   och renderar händelsebrevet. Fältformen: { date, nr, checked, poster[], lugna[] }.

   KRÄVER INLOGGNING. Brevet handlar om publika bolagsnyheter, men listan över
   vilka bolag det handlar om ÄR användarnas innehav, alltså personlig data.
   /api/* är undantaget i middlewaren, så den här funktionen grindar sig själv.
   Låg oskyddad till 2026-08-30, då det upptäcktes att brevet röjde en pilots
   hela portfölj för vem som helst som kunde skriva en URL.

   Brevet är fortfarande GEMENSAMT för alla användare: det byggs ur unionen av
   allas innehav. Inloggning stänger läckan mot internet, inte mellan konton.
   Per-användare-brev är nästa steg.
*/
import { verifieraSession } from "./_lib.js";

const KV_KEY = "brev-latest";

export async function onRequestGet(context) {
  const { env } = context;
  const H = {
    "Content-Type": "application/json; charset=utf-8",
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Cache-Control": "no-store",
  };
  if (!(await verifieraSession(context.request))) {
    return new Response(JSON.stringify({ fel: "Kräver inloggning." }), { status: 401, headers: H });
  }
  if (!env.DATA) return new Response(JSON.stringify({ fel: "KV ej bunden." }), { status: 501, headers: H });
  const cur = await env.DATA.get(KV_KEY);
  if (!cur) return new Response(JSON.stringify({ fel: "Inget brev ännu." }), { status: 404, headers: H });
  return new Response(cur, { headers: H });
}
