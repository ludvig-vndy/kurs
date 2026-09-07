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
// US har inget suffix hos Yahoo: TSLA, inte TSLA.US. Tomma strangen ar alltsa
// ett giltigt varde och far inte forvaxlas med "okand landskod" nedan.
const SUFFIX = { SE: ".ST", NO: ".OL", DK: ".CO", FI: ".HE", IS: ".IC", US: "" };
// Whitelist. "5d" finns med for att Dina bolag bara behover de tva senaste
// stangningarna for dagsforandringen; utan den foll anropet tillbaka pa 1y
// och hamtade 250 punkter per innehav for att lasa av tva.
const RANGES = { "5d": 1, "1mo": 1, "6mo": 1, "1y": 1, "2y": 1, "5y": 1 };

function yahooSymbol(t, c) {
  return String(t).trim().replace(/\./g, "-").toUpperCase() + (SUFFIX[c] || "");
}

/* Hur lange svaret far cachas pa edgen.

   FORE DETTA LAG DEN PA SEX TIMMAR, rakt av. Kallan ar i praktiken realtid:
   uppmatt en mandag 14:43 lag Axfood, Telia och Evolution alla pa senaste avslut
   inom en minut. Sex timmars cache betyder att den forsta besokaren i ett
   fonster far ett farskt pris och alla efter far samma frusna tal tills fonstret
   rullar. Piloten oppnade sidan pa morgonen och igen pa eftermiddagen och sag
   samma kurs, mitt under en handelsdag. Datan var farsk, vi holl kvar den.

   TIDEN STYRS AV DATAN, inte av en borskalender. regularMarketTime ar tidpunkten
   for senaste avslut, sa ar den nyss ar handeln igang och da ska vi vara snabba.
   Ar den timmar gammal ar borsen stangd och da andras ingenting anda. Det
   sjalvjusterar over helger, roda dagar och olika tidszoner, vilket en hardkodad
   oppettidstabell inte gor: US oppnar 15:30 svensk tid, och helgdagarna skiljer
   sig at mellan marknaderna.

   Cachen finns for att skydda mot en skenande klient, inte for att spara pengar.
   Med en handfull innehav per anvandare ar en minut gott om skydd. */
export const CACHE_LIVE = 60;        // handeln pagar
export const CACHE_NYSS = 600;       // stangt nyligen, sista avsluten kan komma in
export const CACHE_STANGT = 3600;    // kvall, natt, helg

export function cacheTid(senasteAvslut, nu = Date.now()) {
  const t = Number(senasteAvslut) * 1000;
  if (!isFinite(t) || t <= 0) return CACHE_NYSS;   // utan tidsstampel: mittemellan
  const minuter = (nu - t) / 60000;
  if (minuter < 0) return CACHE_LIVE;              // klockskillnad, behandla som live
  if (minuter < 45) return CACHE_LIVE;
  if (minuter < 12 * 60) return CACHE_NYSS;
  return CACHE_STANGT;
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
  if (SUFFIX[c] === undefined) return json({ fel: "Ogiltig landskod." }, 400);

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

  // Tidpunkten for senaste avslut. Styr cachetiden, och skickas med sa ytan kan
  // visa NAR talet ar fran i stallet for bara vilken dag. Ett innehav som inte
  // handlats pa en halvtimme ser annars ut som gammal data, fast det ar sant:
  // Unibap lag 30 minuter efter de likvida bolagen vid matningen, och det var
  // marknadens tillstand, inte en fordrojning hos oss.
  const handlad = res.meta && Number(res.meta.regularMarketTime);
  const body = {
    symbol,
    valuta: (res.meta && res.meta.currency) || null,
    uppdaterad: punkter.length ? punkter[punkter.length - 1][0] : null,
    handlad: isFinite(handlad) && handlad > 0 ? new Date(handlad * 1000).toISOString() : null,
    punkter,
  };

  const out = json(body, 200, cacheTid(handlad));
  try { await cache.put(cacheKey, out.clone()); } catch (e) { /* cache ej kritisk */ }
  return out;
}
