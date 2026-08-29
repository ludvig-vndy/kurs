/* Cloudflare Pages Function: kontogrind for hela sajten.
   Korrs pa edgen fore varje request. Ersatter det gamla sajtlosenordet:
   nu kravs ett inloggat Delagaren-konto (Supabase). Klienten speglar sin
   session i en `da_session`-cookie (access-token, JWT); middleware:n verifierar
   JWT:ns signatur (ES256 mot Supabases JWKS) och utgang server-side.

   Publika undantag: landningen, /logga-in, inbjudan (kontoaktivering),
   statiska tillgangar och /api/* (funktionerna gor sin egen auth). Ovrigt
   kraver en giltig session, annars -> /logga-in. */

const COOKIE = 'da_session';
const JWKS_URL = 'https://xpxghvxrckpzbbkjmtcw.supabase.co/auth/v1/.well-known/jwks.json';

// Inbjudan maste vara publik (nya inbjudna har ingen session). Cloudflare Pages
// serverar .html-filer aven pa den rena URL:en och 308-omdirigerar bort .html,
// sa bada formerna listas: /labs/inbjudan OCH /labs/inbjudan.html.
const PUBLIC_EXACT = new Set([
  '/', '/logga-in', '/logga-in/',
  '/labs/inbjudan', '/labs/inbjudan.html',
  '/pilot', '/pilot/',                                       // pilotinloggning, se nedan
]);

// Normalisera pathen FORE alla grindbeslut: avkoda procent-escapes (upprepat, sa
// dubbelkodning inte smugglar) och gemena. Utan detta ser `/labs/data%2fx.json` inte
// ut att borja med `/labs/data/` -> hoppar over grinden -> exempt via .json-regexen,
// medan Cloudflares asset-router anda avkodar %2f -> / och serverar den grindade filen.
// Samma trick med skiftlage (/labs/Data/) eller bakstreck (%5c). Vid trasig kodning:
// returnera null -> behandlas som ej-exempt (grindas).
function normalizePath(rawPath) {
  let p = rawPath;
  for (let i = 0; i < 3; i++) {
    let d;
    try { d = decodeURIComponent(p); } catch { return null; }
    if (d === p) break;
    p = d;
  }
  return p.toLowerCase();
}

function isExempt(path) {
  if (path === null) return false;                            // trasig/smugglad kodning
  if (PUBLIC_EXACT.has(path)) return true;
  if (path.startsWith('/api/')) return true;                 // funktioner auth:ar sjalva
  if (path.startsWith('/_astro/')) return true;              // Astro-bundlar
  if (path.startsWith('/bilder/')) return true;              // bilder
  // Medlems-/prototypdata grindas trots .json-andelsen: sidorna som hamtar den
  // ar inloggade och skickar cookien automatiskt (same-origin fetch).
  if (path.startsWith('/labs/data/')) return false;
  // statiska tillgangar (INTE .html, som ar sidor som ska grindas)
  if (/\.(css|js|mjs|json|map|woff2?|ttf|otf|eot|ico|png|jpe?g|svg|webp|gif|avif|txt|xml)$/i.test(path)) return true;
  return false;
}

function getCookie(request, name) {
  const header = request.headers.get('Cookie') || '';
  for (const part of header.split(';')) {
    const i = part.indexOf('=');
    if (i === -1) continue;
    if (part.slice(0, i).trim() === name) return decodeURIComponent(part.slice(i + 1).trim());
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
async function getKeys() {
  const now = Date.now();
  if (JWKS_CACHE && now - JWKS_AT < 3600e3) return JWKS_CACHE;
  const r = await fetch(JWKS_URL);
  const j = await r.json();
  JWKS_CACHE = (j && j.keys) || [];
  JWKS_AT = now;
  return JWKS_CACHE;
}

async function verifyJwt(token) {
  try {
    const p = token.split('.');
    if (p.length !== 3) return false;
    const header = b64urlToJson(p[0]);
    const payload = b64urlToJson(p[1]);
    if (header.alg !== 'ES256') return false;
    if (!payload.exp || payload.exp * 1000 < Date.now()) return false;
    // Bind token till var egen Supabase-utfardare och publik: en signerad JWT
    // fran ett annat projekt (eller en anon/service-token) far inte slappas in.
    if (payload.aud !== 'authenticated') return false;
    if (payload.iss !== 'https://xpxghvxrckpzbbkjmtcw.supabase.co/auth/v1') return false;
    const keys = await getKeys();
    const jwk = keys.find((k) => k.kid === header.kid) || keys[0];
    if (!jwk) return false;
    const key = await crypto.subtle.importKey('jwk', jwk, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['verify']);
    const data = new TextEncoder().encode(p[0] + '.' + p[1]);
    return await crypto.subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, key, b64urlToBytes(p[2]), data);
  } catch (e) {
    return false;
  }
}

/* Motparten deployas till ett eget Pages-projekt fran samma bygge. Pa den varden
   ska roten visa saljkursen, inte Marginalens landningssida. Omskrivningen sker
   pa vardnamn sa att samma bygge kan serva bada, och den galler aven en framtida
   egen doman: allt som borjar med "motparten" raknas. */
function motpartenVard(hostname) {
  const h = (hostname || '').toLowerCase();
  return h.startsWith('motparten.') || h.startsWith('motparten-');
}

/* Pilotsession for Motparten. En egen, host-scopad cookie som INTE ar en
   Supabase-session: den oppnar bara den har varden och ger ingen tillgang till
   Marginalen, portfoljen eller nagot API. Utfardas av functions/api/pilot-login.js
   till en kort namnlista. Tas bort nar piloten ar over, se LAUNCH.md. */
const PILOT_COOKIE = 'motparten_pilot';

async function verifieraPilot(request, secret) {
  if (!secret) return false;
  const raw = getCookie(request, PILOT_COOKIE);
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

export async function onRequest(context) {
  const { request, next, env } = context;
  const url = new URL(request.url);
  const motparten = motpartenVard(url.hostname);

  if (motparten && (url.pathname === '/' || url.pathname === '/hem' || url.pathname === '/hem/')) {
    return Response.redirect(new URL('/motparten', url.origin).toString(), 302);
  }

  if (isExempt(normalizePath(url.pathname))) return next();

  // Delagaren och Motparten ar skilda produkter och delar darfor ingen session.
  // Pa motparten-varden slapper Delagarens Supabase-JWT INTE in, bara pilotens
  // egen cookie. Pa Marginalens varder galler bara JWT:n, aldrig piloten. Vem som
  // far kopa vilken kurs ar en senare fraga (se LAUNCH.md), men skiljelinjen mellan
  // produkterna gar att halla redan nu, och den halls har.
  if (motparten) {
    if (await verifieraPilot(request, env && env.PILOT_SECRET)) return next();
    return Response.redirect(new URL('/pilot', url.origin).toString(), 302);
  }

  const token = getCookie(request, COOKIE);
  if (token && (await verifyJwt(token))) return next();

  return Response.redirect(new URL('/logga-in', url.origin).toString(), 302);
}
