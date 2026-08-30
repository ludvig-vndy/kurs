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

/* Ar det har Motpartens vardnamn? Delagaren och Motparten ar skilda produkter
   som inte delar session, sa vardnamnet avgor vilken identitet som galler alls.
   Bor darfor finnas pa ETT stalle: bade middlewaren och prospekt-endpointerna
   fragar den har. */
export function arMotpartenVard(hostname) {
  const h = (hostname || '').toLowerCase();
  return h.startsWith('motparten.') || h.startsWith('motparten-');
}

/* Deltagarens mejladress, eller null om cookien saknas, ar forfalskad, har gatt
   ut, eller anropet inte sker pa en motparten-vard.

   Verifieringen och adressuttaget sitter medvetet ihop: en endpoint ska inte
   kunna komma at adressen utan att ha verifierat cookien forst, vilket ar
   precis vad pilotMejl ensam skulle tillata.

   Nar Motparten far riktiga Supabase-konton ersatts den har av verifieraSession,
   och anroparna behover inte andras sa lange de fortsatter fraga efter en adress. */
export async function pilotAdress(request, env) {
  if (!arMotpartenVard(new URL(request.url).hostname)) return null;
  if (!(await verifieraPilot(request, env && env.PILOT_SECRET))) return null;
  const mejl = pilotMejl(request);
  return mejl ? mejl.toLowerCase() : null;
}

/* Delagarsessionen: verifiering av `da_session`-cookien (Supabase access-token,
   ES256 mot projektets JWKS). Bor bara pa ETT stalle: middlewaren grindar
   sidorna med den, och API-funktioner som ror personliga data grindar sig
   sjalva med den, eftersom /api/* ar undantaget i middlewaren.

   verifieraSession returnerar JWT:ns payload (dar `sub` ar anvandarens id) nar
   sessionen haller, annars null. Den som bara vill veta ja eller nej anvander
   returvardet som sanningsvarde. */

export const SESSION_COOKIE = 'da_session';
const JWKS_URL = 'https://xpxghvxrckpzbbkjmtcw.supabase.co/auth/v1/.well-known/jwks.json';
const ISSUER = 'https://xpxghvxrckpzbbkjmtcw.supabase.co/auth/v1';

export function kaka(request, namn) {
  const header = request.headers.get('Cookie') || '';
  for (const del of header.split(';')) {
    const i = del.indexOf('=');
    if (i === -1) continue;
    if (del.slice(0, i).trim() === namn) return decodeURIComponent(del.slice(i + 1).trim());
  }
  return null;
}

function b64urlToBytes(s) {
  s = s.replace(/-/g, '+').replace(/_/g, '/');
  s += '==='.slice((s.length + 3) % 4);
  const bin = atob(s);
  const u = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
  return u;
}
function b64urlToJson(s) {
  return JSON.parse(new TextDecoder().decode(b64urlToBytes(s)));
}

let JWKS_CACHE = null;
let JWKS_AT = 0;
async function nycklar() {
  const nu = Date.now();
  if (JWKS_CACHE && nu - JWKS_AT < 3600e3) return JWKS_CACHE;
  const r = await fetch(JWKS_URL);
  const j = await r.json();
  JWKS_CACHE = (j && j.keys) || [];
  JWKS_AT = nu;
  return JWKS_CACHE;
}

// Payload vid giltig session, annars null.
export async function verifieraSession(request) {
  const token = kaka(request, SESSION_COOKIE);
  if (!token) return null;
  try {
    const p = token.split('.');
    if (p.length !== 3) return null;
    const header = b64urlToJson(p[0]);
    const payload = b64urlToJson(p[1]);
    if (header.alg !== 'ES256') return null;
    if (!payload.exp || payload.exp * 1000 < Date.now()) return null;
    // Bind token till var egen utfardare och publik: en signerad JWT fran ett
    // annat projekt (eller en anon/service-token) far inte slappas in.
    if (payload.aud !== 'authenticated') return null;
    if (payload.iss !== ISSUER) return null;
    const keys = await nycklar();
    const jwk = keys.find((k) => k.kid === header.kid) || keys[0];
    if (!jwk) return null;
    const key = await crypto.subtle.importKey('jwk', jwk, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['verify']);
    const data = new TextEncoder().encode(p[0] + '.' + p[1]);
    const ok = await crypto.subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, key, b64urlToBytes(p[2]), data);
    return ok ? payload : null;
  } catch {
    return null;
  }
}
