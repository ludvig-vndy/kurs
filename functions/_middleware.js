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
]);

function isExempt(path) {
  if (PUBLIC_EXACT.has(path)) return true;
  if (path.startsWith('/api/')) return true;                 // funktioner auth:ar sjalva
  if (path.startsWith('/_astro/')) return true;              // Astro-bundlar
  if (path.startsWith('/bilder/')) return true;              // bilder
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

export async function onRequest(context) {
  const { request, next } = context;
  const url = new URL(request.url);
  if (isExempt(url.pathname)) return next();

  const token = getCookie(request, COOKIE);
  if (token && (await verifyJwt(token))) return next();

  // Ingen giltig session -> till inloggningen.
  return Response.redirect(new URL('/logga-in', url.origin).toString(), 302);
}
