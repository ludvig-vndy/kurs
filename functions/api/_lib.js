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

/* Pilotsession for Motparten. Egen, host-scopad cookie som INTE ar en Supabase-session.
   Bor har och inte i _middleware.js eftersom bade grinden och coach-endpointen behover
   den. Utfardas av pilot-login.js. Tas bort nar piloten ar over, se LAUNCH.md. */
export const PILOT_COOKIE = 'motparten_pilot';

function lasCookie(request, namn) {
  const raw = request.headers.get('Cookie') || '';
  for (const del of raw.split(';')) {
    const i = del.indexOf('=');
    if (i === -1) continue;
    if (del.slice(0, i).trim() === namn) return del.slice(i + 1).trim();
  }
  return null;
}

export async function verifieraPilot(request, secret) {
  if (!secret) return false;
  const raw = lasCookie(request, PILOT_COOKIE);
  if (!raw) return false;
  const delar = decodeURIComponent(raw).split('|');
  if (delar.length !== 3) return false;
  const [mejl, utgang, sig] = delar;
  if (!/^\d+$/.test(utgang) || Number(utgang) < Math.floor(Date.now() / 1000)) return false;
  try {
    const key = await crypto.subtle.importKey(
      'raw', new TextEncoder().encode(secret),
      { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
    );
    const bytes = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${mejl}|${utgang}`));
    let b = '';
    for (const x of new Uint8Array(bytes)) b += String.fromCharCode(x);
    const vantad = btoa(b).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    // Jamforelse i konstant tid sa signaturen inte gar att gissa fram tecken for tecken.
    if (vantad.length !== sig.length) return false;
    let diff = 0;
    for (let i = 0; i < vantad.length; i++) diff |= vantad.charCodeAt(i) ^ sig.charCodeAt(i);
    return diff === 0;
  } catch {
    return false;
  }
}

/** Mejladressen ur en redan verifierad cookie. Anropa aldrig utan verifieraPilot forst. */
export function pilotMejl(request) {
  const raw = lasCookie(request, PILOT_COOKIE);
  if (!raw) return null;
  const delar = decodeURIComponent(raw).split('|');
  return delar.length === 3 ? delar[0] : null;
}
