/* functions/api/bolagssok.js  —  bolagssök mot Yahoo Finance.

   Den bundlade companies.json är en ögonblicksbild av de ~500 största bolagen
   per marknad. Den täcker inte First North, och därmed inte Ferroamp, Nyab och
   resten av småbolagssvansen, som är precis vad den här målgruppen äger. Det
   här söket fyller svansen: Yahoo känner hela Norden inklusive First North.

   Vi använder redan Yahoo för kurshistoriken, så det är ingen ny källa och
   ingen ny risk. Symbolen kommer dessutom tillbaka i exakt den form
   /api/kurshistorik vill ha: FERRO.ST, LIFCO-B.ST. Vi delar upp den i ticker
   och landskod och lagrar den formen på innehavet.

   KRÄVER INLOGGNING: /api/* är undantaget i kontogrinden, så funktionen grindar
   sig själv. Söket är inte personlig data, men en öppen proxy mot Yahoo är
   ingenting att bjuda på.
*/
import { verifieraSession } from "./_lib.js";

// Yahoo-suffix -> vår landskod.
const LAND = { ST: "SE", OL: "NO", CO: "DK", HE: "FI", IC: "IS" };
const BORS = { SE: "Stockholm", NO: "Oslo", DK: "Köpenhamn", FI: "Helsingfors", IS: "Reykjavik", US: "USA" };

/* Amerikanska symboler bär inget suffix hos Yahoo: TSLA, inte TSLA.US. Regeln
   "har den ingen punkt så hoppa över den" var därför det enda som höll dem
   ute. Vi kan inte bara släppa allt punktlöst igenom, för då drar en sökning
   på Tesla in ett halvdussin tyska och brasilianska smålistor. Så vi listar de
   börser vi faktiskt kan prissätta i stället. */
const US_BORS = new Set(["NMS", "NGM", "NCM", "NYQ", "ASE", "PCX", "BTS", "NAS", "NYS"]);

/** Yahoos träfflista -> våra bolag. Ren funktion, prövas i tools/__tests__. */
export function tolkaTraffar(quotes) {
  const traffar = [];
  const sedda = new Set();
  for (const x of quotes || []) {
    if (x.quoteType !== "EQUITY" || !x.symbol) continue;
    const sym = String(x.symbol);
    const punkt = sym.lastIndexOf(".");
    let land, ticker;
    if (punkt === -1) {
      if (!US_BORS.has(String(x.exchange || "").toUpperCase())) continue;
      land = "US";
      ticker = sym.toUpperCase();
    } else {
      land = LAND[sym.slice(punkt + 1).toUpperCase()];
      if (!land) continue; // en börs vi inte kan prissätta
      ticker = sym.slice(0, punkt).toUpperCase();
    }
    if (sedda.has(ticker + land)) continue;
    sedda.add(ticker + land);
    traffar.push({
      namn: (x.longname || x.shortname || ticker).trim(),
      ticker,          // FERRO, LIFCO-B, TSLA
      land,            // SE, US
      bors: BORS[land],
      symbol: sym      // FERRO.ST, TSLA, för spårbarhet
    });
  }
  return traffar;
}

export async function onRequestGet(context) {
  const { env, request } = context;
  const H = {
    "Content-Type": "application/json; charset=utf-8",
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Cache-Control": "no-store",
  };
  if (!(await verifieraSession(request))) {
    return new Response(JSON.stringify({ fel: "Kräver inloggning." }), { status: 401, headers: H });
  }

  const q = (new URL(request.url).searchParams.get("q") || "").trim();
  if (q.length < 2) return new Response(JSON.stringify({ traffar: [] }), { headers: H });
  if (q.length > 40) return new Response(JSON.stringify({ fel: "För lång sökning." }), { status: 400, headers: H });

  // Cachea per sökterm på edgen: samma bolagsnamn söks om och om igen, och
  // Yahoo behöver inte se varje tangenttryckning från varje användare.
  const cacheNyckel = new Request(`https://bolagssok.internal/?q=${encodeURIComponent(q.toLowerCase())}`);
  const cache = caches.default;
  const traff = await cache.match(cacheNyckel);
  if (traff) return traff;

  let quotes = [];
  try {
    const url = `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(q)}&quotesCount=20&newsCount=0`;
    const r = await fetch(url, { headers: { "user-agent": "Mozilla/5.0", accept: "application/json" } });
    if (!r.ok) throw new Error("HTTP " + r.status);
    quotes = (await r.json()).quotes || [];
  } catch {
    return new Response(JSON.stringify({ fel: "Söket är inte tillgängligt just nu." }), { status: 502, headers: H });
  }

  const traffar = tolkaTraffar(quotes);

  const svar = new Response(JSON.stringify({ traffar }), {
    headers: { ...H, "Cache-Control": "public, max-age=86400" },
  });
  context.waitUntil(cache.put(cacheNyckel, svar.clone()));
  return svar;
}
