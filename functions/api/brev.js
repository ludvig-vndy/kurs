/* functions/api/brev.js  —  serverar den inloggades dagsbrev ur KV.

   KRÄVER INLOGGNING, och serverar bara DEN INLOGGADES brev. Brevet handlar om
   publika bolagsnyheter, men listan över vilka bolag det handlar om ÄR
   användarens innehav, alltså personlig data.

   Två saker gick fel här och båda är rättade 2026-08-30:
   1. Endpointen låg under /api/*, som är undantaget i kontogrinden, och gjorde
      ingen egen auth. Vem som helst kunde curla den och läsa en pilots hela
      innehav.
   2. Brevet var GEMENSAMT, byggt ur unionen av allas innehav, så två inloggade
      piloter såg varandras portföljer. Nu skriver motorn ett brev per användare
      till nyckeln brev:<user_id>, och vi hämtar bara den inloggades.

   Motorn (natt.mjs) skriver brev-<user_id>.json och publicerar dem med
   motor/publicera-brev.mjs. Fältformen: { date, nr, checked, poster[], lugna[],
   brev[] }.
*/
import { verifieraSession } from "./_lib.js";

export async function onRequestGet(context) {
  const { env, request } = context;
  const H = {
    "Content-Type": "application/json; charset=utf-8",
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Cache-Control": "no-store",
  };

  const session = await verifieraSession(request);
  if (!session || !session.sub) {
    return new Response(JSON.stringify({ fel: "Kräver inloggning." }), { status: 401, headers: H });
  }
  if (!env.DATA) return new Response(JSON.stringify({ fel: "KV ej bunden." }), { status: 501, headers: H });

  // Nyckeln byggs ur den verifierade sessionens sub, aldrig ur något klienten
  // skickar. Det är det som gör att ingen kan be om någon annans brev.
  const brev = await env.DATA.get(`brev:${session.sub}`);
  if (!brev) {
    return new Response(JSON.stringify({
      fel: "Inget brev ännu.",
      forklaring: "Lägg till dina bolag, så skriver motorn ditt första brev i natt.",
    }), { status: 404, headers: H });
  }
  return new Response(brev, { headers: H });
}
