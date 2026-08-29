/* functions/api/pilot-login.js  —  pilotinloggning för Motparten.

   Ger en handfull namngivna adresser tillgång till saljkursens pilot genom att
   bara skriva sin mejl. Det ar med avsikt en svagare grind an resten av sajten,
   och den ar darfor inhagnad pa fyra satt:

     1. Fungerar BARA pa motparten-varden. Anropas den pa kurs-7m8 svarar den 404.
     2. Satter en EGEN cookie, inte en Supabase-session. Den oppnar alltsa
        ingenting pa Marginalen, och inget konto skapas nagonstans.
     3. Bara adresser i ALLOWLIST slapps in. Ingen oppen registrering.
     4. Kraver PILOT_SECRET pa projektet. Saknas den svarar endpointen 501,
        alltsa faller den stangd precis som ovriga funktioner.

   Cookien ar signerad med HMAC-SHA256 over "mejl|utgang" sa den inte gar att
   forfalska, och den lever i 30 dagar.

   Tas bort nar piloten ar over. Se LAUNCH.md. */

import { secureJson as json, rateLimited } from './_lib.js';

const ALLOWLIST = new Set(['ludvig@vndy.se', 'sebastian@vndy.se']);
const COOKIE = 'motparten_pilot';
const MAX_ALDER = 60 * 60 * 24 * 30; // 30 dagar

function arMotpartenVard(hostname) {
  const h = (hostname || '').toLowerCase();
  return h.startsWith('motparten.') || h.startsWith('motparten-');
}

function b64url(bytes) {
  let s = '';
  for (const b of new Uint8Array(bytes)) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export async function signera(payload, secret) {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload));
  return b64url(sig);
}

export async function onRequestPost(context) {
  const { request, env } = context;
  const url = new URL(request.url);

  if (!arMotpartenVard(url.hostname)) return new Response('Not found', { status: 404 });
  if (!env.PILOT_SECRET) return json({ error: 'ej konfigurerad (saknar PILOT_SECRET)' }, 501);

  // KV-bindningen RL finns bara pa projektet kurs. Saknas den slapper limitern
  // igenom, vilket ar acceptabelt har: svaret ar identiskt for adresser i och
  // utanfor listan, sa endpointen gar inte att anvanda for att rakna ut vilka
  // som slapps in, och den ger inget at den som gissar.
  const stopp = await rateLimited(env, request, 'pilot-login', 10, 600);
  if (stopp) return stopp;

  let mejl = '';
  try {
    const body = await request.json();
    mejl = String(body.email || '').trim().toLowerCase();
  } catch {
    return json({ error: 'ogiltig json' }, 400);
  }

  // Samma svar oavsett om adressen finns i listan eller inte, sa endpointen inte
  // gar att anvanda for att rakna ut vilka som ar med.
  if (!ALLOWLIST.has(mejl)) return json({ ok: true }, 200);

  const utgang = Math.floor(Date.now() / 1000) + MAX_ALDER;
  const payload = `${mejl}|${utgang}`;
  const varde = `${payload}|${await signera(payload, env.PILOT_SECRET)}`;

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Set-Cookie': `${COOKIE}=${encodeURIComponent(varde)}; Path=/; Max-Age=${MAX_ALDER}; HttpOnly; Secure; SameSite=Lax`,
      'Cache-Control': 'no-store',
    },
  });
}
