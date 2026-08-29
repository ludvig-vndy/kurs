/* functions/api/coach.js  -  Saljcoachen, server-side.

   Tva steg: steg 1 routar fragan till hogst fem lektioner ur REGISTER, steg 2 svarar pa
   full text ur dem. Se docs/superpowers/specs/2026-08-29-saljcoachen-design.md.

   Allt faller stangt: utan giltig pilotcookie 401, utan PILOT_SECRET,
   ANTHROPIC_API_KEY eller KV-bindningen RL 501, utan matchande Origin 403.
   RL ar avsiktligt fail-closed har, till skillnad fran i fraga.js: en betald endpoint
   far aldrig sta ostrypt for att en bindning glomts bort. */

import { secureJson as json, verifieraPilot, pilotMejl } from './_lib.js';

const MAX_FRAGA = 6000;
const MAX_KONTEXT = 8000;
const TAK_MINUT = 6;
const TAK_DYGN = 40;
const TAK_GLOBALT = 300;

export async function onRequestPost(context) {
  const { request, env } = context;
  const url = new URL(request.url);

  // 1. Konfiguration. Faller stangt, i tur och ordning.
  if (!env.ANTHROPIC_API_KEY) return json({ error: 'Coachen ar inte konfigurerad.' }, 501);
  if (!env.PILOT_SECRET) return json({ error: 'Coachen ar inte konfigurerad.' }, 501);
  if (!env.RL) return json({ error: 'Coachen ar inte konfigurerad.' }, 501);

  // 2. Ursprung. Cookien ar SameSite=Lax, men kontraktet ska sta har och inte antas.
  const origin = request.headers.get('Origin');
  if (!origin || origin !== url.origin) return json({ error: 'Fel ursprung.' }, 403);
  const typ = request.headers.get('Content-Type') || '';
  if (!typ.includes('application/json')) return json({ error: 'Fel innehallstyp.' }, 415);

  // 3. Session.
  if (!(await verifieraPilot(request, env.PILOT_SECRET))) {
    return json({ error: 'Du behover vara inloggad.' }, 401);
  }
  const mejl = pilotMejl(request);

  // 4. Indata och tak.
  let fraga = '';
  let komplettering = null;
  try {
    const kropp = await request.json();
    fraga = String(kropp.fraga || '').trim();
    if (kropp.komplettering && typeof kropp.komplettering === 'object') {
      komplettering = {
        ursprunglig_fraga: String(kropp.komplettering.ursprunglig_fraga || '').trim(),
        coachens_fraga: String(kropp.komplettering.coachens_fraga || '').trim(),
      };
    }
  } catch {
    return json({ error: 'Trasig begaran.' }, 400);
  }
  if (!fraga) return json({ error: 'Skriv en fraga forst.' }, 400);
  if (fraga.length > MAX_FRAGA) {
    return json({ error: `Fragan far vara hogst ${MAX_FRAGA} tecken.` }, 400);
  }
  const kontextlangd = fraga.length +
    (komplettering ? komplettering.ursprunglig_fraga.length + komplettering.coachens_fraga.length : 0);
  if (kontextlangd > MAX_KONTEXT) {
    return json({ error: 'For mycket text. Korta ned och forsok igen.' }, 400);
  }

  // 5. Strypning: per identitet, inte per IP. En identitet gar inte att byta som en IP.
  const stopp = await stryp(env.RL, mejl);
  if (stopp) return json({ error: stopp }, 429);

  return json({ error: 'Coachen ar inte klar an.' }, 501);
}

/* Grov fonsterrakning i KV. Inte atomiskt, men racker som kostnadsskydd. Tre fonster:
   per minut och dygn for identiteten, plus ett globalt dygnstak for dagen da nagot gatt
   fel och alla konton hamrar samtidigt. */
async function stryp(kv, mejl) {
  const nu = Date.now();
  const id = mejl || 'okand';
  const fonster = [
    { nyckel: `coach:m:${id}:${Math.floor(nu / 60e3)}`, tak: TAK_MINUT, ttl: 120,
      fel: 'Manga fragor pa kort tid. Vanta en minut.' },
    { nyckel: `coach:d:${id}:${Math.floor(nu / 864e5)}`, tak: TAK_DYGN, ttl: 90000,
      fel: 'Du har natt dagens grans for fragor. Den aterstalls i morgon.' },
    { nyckel: `coach:global:${Math.floor(nu / 864e5)}`, tak: TAK_GLOBALT, ttl: 90000,
      fel: 'Coachen ar overbelastad just nu. Forsok igen i morgon.' },
  ];
  for (const f of fonster) {
    let n = 0;
    try {
      n = parseInt((await kv.get(f.nyckel)) || '0', 10) || 0;
    } catch {
      // KV nere: strypningen kan inte gora sitt jobb, sa vi slapper inte igenom.
      return 'Coachen ar tillfalligt otillganglig.';
    }
    if (n >= f.tak) return f.fel;
    try { await kv.put(f.nyckel, String(n + 1), { expirationTtl: f.ttl }); } catch { /* ok */ }
  }
  return null;
}
