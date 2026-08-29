/* functions/api/prospekt/arbete.js  —  POST /api/prospekt/arbete

   Sparar deltagarens status, värde och anteckning på en rad. En rad i taget,
   för sidan skickar när fältet ändras och inte i klump.

   Body: { rad_id, status?, varde?, anteckning? }

   Raden måste tillhöra en lista deltagaren köpt, annars går det inte att
   skriva. Kontrollen görs mot databasen och inte mot något klienten skickar,
   så ett gissat rad_id leder ingenstans.

   Är allt tomt igen raderas raden i stället för att ligga kvar som skräp. */

import { secureJson as json, rateLimited } from '../_lib.js';
import { pilotAdress } from '../_pilot.js';
import { supaConfig, supaGet, supaUpsert, supaDelete } from '../_supa.js';

const STATUSAR = new Set(['ny', 'forsokt', 'pratat', 'intresse', 'nej']);
const MAX_ANTECKNING = 2000;
const MAX_VARDE = 1e12;

export async function onRequestPost(context) {
  const { request, env } = context;

  const cfg = supaConfig(env);
  if (!cfg) return json({ error: 'ej konfigurerad' }, 501);

  const limited = await rateLimited(env, request, 'prospekt-arbete', 240, 5000);
  if (limited) return json({ error: limited }, 429);

  const adress = await pilotAdress(request, env);
  if (!adress) return json({ error: 'ej inloggad' }, 401);

  let body;
  try { body = await request.json(); } catch (e) { return json({ error: 'ogiltig json' }, 400); }

  const radId = String(body.rad_id || '').trim();
  if (!/^[0-9a-f-]{36}$/i.test(radId)) return json({ error: 'ogiltigt rad_id' }, 400);

  const status = String(body.status || 'ny').toLowerCase();
  if (!STATUSAR.has(status)) return json({ error: 'ogiltig status' }, 400);

  let varde = null;
  if (body.varde !== null && body.varde !== undefined && body.varde !== '') {
    const n = Math.round(Number(body.varde));
    if (!Number.isFinite(n) || n < 0 || n > MAX_VARDE) return json({ error: 'ogiltigt varde' }, 400);
    varde = n || null;
  }

  let anteckning = null;
  if (typeof body.anteckning === 'string' && body.anteckning.trim()) {
    anteckning = body.anteckning.slice(0, MAX_ANTECKNING);
  }

  try {
    // Vilken lista tillhör raden, och har adressen köpt den?
    const rader = await supaGet(cfg, `prospekt_rad?select=lista_id&id=eq.${radId}`);
    if (!Array.isArray(rader) || !rader.length) return json({ error: 'ingen atkomst' }, 403);
    const listaId = rader[0].lista_id;

    const kop = await supaGet(cfg,
      `prospekt_kop?select=id&lista_id=eq.${listaId}&epost=eq.${encodeURIComponent(adress)}`);
    if (!Array.isArray(kop) || !kop.length) return json({ error: 'ingen atkomst' }, 403);

    const tomt = status === 'ny' && varde === null && anteckning === null;
    if (tomt) {
      await supaDelete(cfg,
        `prospekt_arbete?rad_id=eq.${radId}&epost=eq.${encodeURIComponent(adress)}`);
      return json({ ok: true, sparat: false });
    }

    await supaUpsert(cfg, 'prospekt_arbete', [{
      rad_id: radId,
      lista_id: listaId,
      epost: adress,
      status,
      varde_kr: varde,
      anteckning,
    }], 'rad_id,epost');

    return json({ ok: true, sparat: true });
  } catch (e) {
    return json({ error: 'kunde inte spara' }, 502);
  }
}
