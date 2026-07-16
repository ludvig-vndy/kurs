/* functions/api/_lib.js  —  delade hjälpare för API-funktionerna.
   Underscore-prefixet gör att Pages inte routar filen; den importeras bara. */

// JSON-svar med säkerhetsheaders. _headers i public/ gäller INTE Pages
// Functions-svar, så nosniff + Referrer-Policy sätts direkt här. no-store så
// känsliga svar (länkar, status) inte cachas av mellanliggande lager.
export function secureJson(obj, status) {
  return new Response(JSON.stringify(obj), {
    status: status || 200,
    headers: {
      "Content-Type": "application/json",
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "strict-origin-when-cross-origin",
      "Cache-Control": "no-store",
    },
  });
}

// Grov, KV-baserad IP-rate-limit (bindningen RL, se wrangler.toml). Returnerar
// ett felmeddelande (sträng) när gränsen nåtts, annars null. Utan RL-bindning:
// släpp igenom (limitern får aldrig bli en single point of failure). KV är inte
// atomiskt, men grov fönsterräkning räcker som missbruks-/kostnadsskydd.
export async function rateLimited(env, request, prefix, perMin, perDay) {
  const kv = env.RL;
  if (!kv) return null;
  const ip = request.headers.get("CF-Connecting-IP") || "okand";
  const now = Date.now();
  const windows = [
    { key: prefix + ":m:" + ip + ":" + Math.floor(now / 60e3), max: perMin, ttl: 120 },
    { key: prefix + ":d:" + ip + ":" + Math.floor(now / 864e5), max: perDay, ttl: 90000 },
  ];
  for (const w of windows) {
    let n = 0;
    try { n = parseInt((await kv.get(w.key)) || "0", 10) || 0; } catch (e) { return null; }
    if (n >= w.max) return "För många försök på kort tid. Vänta en stund och försök igen.";
    try { await kv.put(w.key, String(n + 1), { expirationTtl: w.ttl }); } catch (e) { /* ok */ }
  }
  return null;
}
