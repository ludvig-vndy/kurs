/* functions/api/kurshistorik.js  —  daglig kurshistorik för ett nordiskt bolag.

   Publik prisdata (ingen inloggning krävs; /api/* är undantaget i grinden).
   Hämtar daglig stängningskurs från Yahoo Finance server-side, så klienten
   slipper CORS och vi kan edge-cacha svaret. Källan är samma slags publika
   marknadsdata som companies.json, inte Börsdata (ingen licensfråga).

   GET /api/kurshistorik?t=SIVE&c=SE[&range=1y]
     t = ticker som i companies.json (punkt för aktieslag, t.ex. LIFCO.B)
     c = landskod: SE|NO|DK|FI|IS
   Svar: { symbol, valuta, uppdaterad, punkter:[[ "YYYY-MM-DD", close ], ...] }
*/
import { rateLimited } from "./_lib.js";

// Landskod -> Yahoo-börssuffix. Aktieslag skrivs med bindestreck hos Yahoo
// (LIFCO.B -> LIFCO-B.ST), companies.json använder punkt.
const SUFFIX = { SE: ".ST", NO: ".OL", DK: ".CO", FI: ".HE", IS: ".IC" };
const RANGES = { "6mo": 1, "1y": 1, "2y": 1, "5y": 1 }; // whitelist

function yahooSymbol(t, c) {
  return String(t).trim().replace(/\./g, "-").toUpperCase() + (SUFFIX[c] || "");
}

function json(obj, status, cacheSeconds) {
  const headers = {
    "Content-Type": "application/json",
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Cache-Control": cacheSeconds
      ? "public, max-age=" + cacheSeconds + ", s-maxage=" + cacheSeconds
      : "no-store",
  };
  return new Response(JSON.stringify(obj), { status: status || 200, headers });
}

export async function onRequestGet(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const t = (url.searchParams.get("t") || "").trim();
  const c = (url.searchParams.get("c") || "").trim().toUpperCase();
  let range = (url.searchParams.get("range") || "1y").trim();
  if (!RANGES[range]) range = "1y";

  // Validering: ticker får bara innehålla bokstäver, siffror, punkt, bindestreck.
  if (!t || !/^[A-Za-z0-9.\-]{1,14}$/.test(t)) return json({ fel: "Ogiltig ticker." }, 400);
  if (!SUFFIX[c]) return json({ fel: "Ogiltig landskod." }, 400);

  // Grov rate-limit (edge-cachen bär det mesta; detta skyddar cache-missar).
  const limited = await rateLimited(env, request, "hist", 60, 2000);
  if (limited) return json({ fel: limited }, 429);

  const symbol = yahooSymbol(t, c);

  // Edge-cache: nyckel per symbol+range. Prisdata behöver inte vara sekundfärsk.
  const cacheKey = new Request(url.origin + "/api/kurshistorik?sym=" + symbol + "&range=" + range, request);
  const cache = caches.default;
  const hit = await cache.match(cacheKey);
  if (hit) return hit;

  const y =
    "https://query1.finance.yahoo.com/v8/finance/chart/" +
    encodeURIComponent(symbol) +
    "?range=" + range + "&interval=1d";

  let data;
  try {
    const r = await fetch(y, { headers: { "User-Agent": "Mozilla/5.0", Accept: "application/json" } });
    if (!r.ok) return json({ fel: "Kunde inte hämta historik.", status: r.status, symbol }, 502);
    data = await r.json();
  } catch (e) {
    return json({ fel: "Kunde inte hämta historik." }, 502);
  }

  const res = data && data.chart && data.chart.result && data.chart.result[0];
  if (!res || !res.timestamp) return json({ fel: "Ingen historik för symbolen.", symbol }, 404);

  const ts = res.timestamp;
  const close = (res.indicators && res.indicators.quote && res.indicators.quote[0] && res.indicators.quote[0].close) || [];
  const punkter = [];
  for (let i = 0; i < ts.length; i++) {
    const v = close[i];
    if (v == null) continue; // dagens ej stängda stapel m.m.
    punkter.push([new Date(ts[i] * 1000).toISOString().slice(0, 10), Math.round(v * 10000) / 10000]);
  }

  const body = {
    symbol,
    valuta: (res.meta && res.meta.currency) || null,
    uppdaterad: punkter.length ? punkter[punkter.length - 1][0] : null,
    punkter,
  };

  // 6h edge-cache. Daglig data ändras en gång per handelsdag.
  const out = json(body, 200, 21600);
  try { await cache.put(cacheKey, out.clone()); } catch (e) { /* cache ej kritisk */ }
  return out;
}
