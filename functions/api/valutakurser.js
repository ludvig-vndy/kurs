/* functions/api/valutakurser.js  —  växelkurser mot kronan.

   Publik marknadsdata från Yahoo, samma källa som /api/kurshistorik, så ingen
   ny licensfråga. Kurserna behövs för att Dina bolag ska kunna summera en
   portfölj som innehåller både Stockholm, Helsingfors och New York.

   GET /api/valutakurser
   Svar: { bas: "SEK", uppdaterad, kurser: { SEK: 1, EUR: 11.4, ... },
           saknas: ["ISK"] }

   En valuta som inte gick att hämta utelämnas ur `kurser` och namnges i
   `saknas`. Klienten ska då avstå från att räkna, inte gissa 1:1.
*/
import { PAR, yahooSymbolFor, kursUrChart } from "./_valuta.js";
import { rateLimited } from "./_lib.js";

function json(obj, status, cacheSeconds) {
  return new Response(JSON.stringify(obj), {
    status: status || 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "strict-origin-when-cross-origin",
      "Cache-Control": cacheSeconds
        ? "public, max-age=" + cacheSeconds + ", s-maxage=" + cacheSeconds
        : "no-store",
    },
  });
}

async function hamtaKurs(valuta) {
  const sym = yahooSymbolFor(valuta);
  if (!sym) return null;
  const url = "https://query1.finance.yahoo.com/v8/finance/chart/" +
    encodeURIComponent(sym) + "?range=1d&interval=1d";
  try {
    const r = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0", Accept: "application/json" } });
    if (!r.ok) return null;
    return kursUrChart(await r.json());
  } catch (e) {
    return null;
  }
}

export async function onRequestGet(context) {
  const { request, env } = context;

  const limited = await rateLimited(env, request, "fx", 30, 2000);
  if (limited) return json({ fel: limited }, 429);

  // Edge-cache: växelkurser behöver inte vara sekundfärska för en portföljvy.
  const cacheKey = new Request(new URL(request.url).origin + "/api/valutakurser", request);
  const cache = caches.default;
  const hit = await cache.match(cacheKey);
  if (hit) return hit;

  const valutor = Object.keys(PAR);
  const svar = await Promise.all(valutor.map(hamtaKurs));

  const kurser = { SEK: 1 };
  const saknas = [];
  valutor.forEach((v, i) => {
    if (svar[i] == null) saknas.push(v);
    else kurser[v] = Math.round(svar[i] * 10000) / 10000;
  });

  // Faller allt är något större fel; svara 502 hellre än att låta klienten tro
  // att en tom kurslista betyder att allt är i kronor.
  if (Object.keys(kurser).length === 1) {
    return json({ fel: "Kunde inte hämta växelkurser.", saknas }, 502);
  }

  const out = json({
    bas: "SEK",
    uppdaterad: new Date().toISOString().slice(0, 16).replace("T", " "),
    kurser,
    saknas,
  }, 200, 3600);
  try { await cache.put(cacheKey, out.clone()); } catch (e) { /* cache ej kritisk */ }
  return out;
}
