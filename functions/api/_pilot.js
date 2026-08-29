/* functions/api/_pilot.js  —  verifierar Motpartens pilotcookie.

   Spegelvänd mot signeringen i pilot-login.js: cookien innehåller
   "mejl|utgång|signatur" där signaturen är HMAC-SHA256 över "mejl|utgång"
   med PILOT_SECRET. Den här filen läser den åt andra endpoints så att
   identiteten bara härleds på ett ställe.

   Underscore-prefixet gör att Pages inte routar filen; den importeras bara.

   När Motparten får riktiga Supabase-konton ersätts den här av samma
   JWT-verifiering som _middleware.js gör, och anroparna behöver inte ändras
   så länge de fortsätter fråga efter en adress. */

const COOKIE = 'motparten_pilot';

export function arMotpartenVard(hostname) {
  const h = (hostname || '').toLowerCase();
  return h.startsWith('motparten.') || h.startsWith('motparten-');
}

function b64url(bytes) {
  let s = '';
  for (const b of new Uint8Array(bytes)) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function signera(payload, secret) {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  return b64url(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload)));
}

// Konstant tid, så svarstiden inte läcker hur många tecken som stämde.
function likaKonstantTid(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function lasCookie(request, namn) {
  const raw = request.headers.get('Cookie') || '';
  for (const del of raw.split(';')) {
    const i = del.indexOf('=');
    if (i < 0) continue;
    if (del.slice(0, i).trim() === namn) return decodeURIComponent(del.slice(i + 1).trim());
  }
  return null;
}

/* Returnerar deltagarens mejladress, eller null om cookien saknas, är
   förfalskad, har gått ut eller anropet inte sker på en motparten-värd. */
export async function pilotAdress(request, env) {
  if (!env.PILOT_SECRET) return null;
  if (!arMotpartenVard(new URL(request.url).hostname)) return null;

  const varde = lasCookie(request, COOKIE);
  if (!varde) return null;

  const delar = varde.split('|');
  if (delar.length !== 3) return null;
  const [mejl, utgang, signatur] = delar;
  if (!mejl || !utgang || !signatur) return null;

  const utgangSek = parseInt(utgang, 10);
  if (!Number.isFinite(utgangSek) || utgangSek * 1000 < Date.now()) return null;

  const vantad = await signera(`${mejl}|${utgang}`, env.PILOT_SECRET);
  if (!likaKonstantTid(vantad, signatur)) return null;

  return mejl.toLowerCase();
}
