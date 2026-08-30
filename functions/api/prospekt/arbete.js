/* functions/api/prospekt/arbete.js  —  POST /api/prospekt/arbete

   Sparar deltagarens status, värde och anteckning på en rad. En rad i taget,
   för sidan skickar när fältet ändras och inte i klump.

   Body: { cfar, status?, varde?, anteckning?, kontaktresultat?, orsak?, listfel? }

   Arbetsstället måste förekomma i en lista deltagaren köpt, annars går det
   inte att skriva. Kontrollen görs mot databasen och inte mot något klienten
   skickar, så ett gissat cfar leder ingenstans.

   Är allt tomt igen raderas raden i stället för att ligga kvar som skräp. */

import { secureJson as json, rateLimited } from '../_lib.js';
import { pilotAdress } from '../_lib.js';
import { supaConfig, supaGet, supaUpsert, supaDelete } from '../_supa.js';

const STATUSAR = new Set(['ny', 'forsokt', 'pratat', 'intresse', 'nej']);

// Tre oberoende dimensioner vid sidan av statusen. Ett bolag som aldrig
// svarade är inget negativt exempel på listkvalitet, och en rad i fel bransch
// är fel oavsett om någon ringde. Slås de ihop till ett enda "varför" tränar
// man på flera olika saker samtidigt.
const KODER = {
  kontaktresultat: new Set(['inget_svar', 'fel_nummer', 'fel_person', 'natt_fram', 'ombedd_aterkomma']),
  orsak: new Set(['har_leverantor', 'inget_behov', 'for_dyrt', 'fel_tajming', 'ingen_beslutsratt', 'annat']),
  listfel: new Set(['fel_bransch', 'fel_storlek', 'fel_geografi', 'ar_kedja', 'nedlagt', 'dubblett']),
};
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

  const cfar = String(body.cfar || '').trim();
  if (!/^[0-9]{1,20}$/.test(cfar)) return json({ error: 'ogiltigt cfar' }, 400);

  const status = String(body.status || 'ny').toLowerCase();
  if (!STATUSAR.has(status)) return json({ error: 'ogiltig status' }, 400);

  let varde = null;
  if (body.varde !== null && body.varde !== undefined && body.varde !== '') {
    const n = Math.round(Number(body.varde));
    if (!Number.isFinite(n) || n < 0 || n > MAX_VARDE) return json({ error: 'ogiltigt varde' }, 400);
    varde = n || null;
  }

  const koder = {};
  for (const [falt, tillatna] of Object.entries(KODER)) {
    const v = body[falt];
    if (v === undefined || v === null || v === '') { koder[falt] = null; continue; }
    if (!tillatna.has(String(v))) return json({ error: 'ogiltig ' + falt }, 400);
    koder[falt] = String(v);
  }

  let anteckning = null;
  if (typeof body.anteckning === 'string' && body.anteckning.trim()) {
    anteckning = body.anteckning.slice(0, MAX_ANTECKNING);
  }

  try {
    // Finns arbetsstället i någon lista adressen köpt?
    const kopta = await supaGet(cfg,
      `prospekt_kop?select=lista_id&epost=eq.${encodeURIComponent(adress)}`);
    if (!Array.isArray(kopta) || !kopta.length) return json({ error: 'ingen atkomst' }, 403);
    const listor = kopta.map((k) => k.lista_id);

    const rader = await supaGet(cfg,
      `prospekt_rad?select=lista_id&cfar=eq.${encodeURIComponent(cfar)}` +
      `&lista_id=in.(${listor.join(',')})&limit=1`);
    if (!Array.isArray(rader) || !rader.length) return json({ error: 'ingen atkomst' }, 403);
    const listaId = rader[0].lista_id;

    const tomt = status === 'ny' && varde === null && anteckning === null &&
      !koder.kontaktresultat && !koder.orsak && !koder.listfel;
    if (tomt) {
      await supaDelete(cfg,
        `prospekt_arbete?cfar=eq.${encodeURIComponent(cfar)}` +
        `&epost=eq.${encodeURIComponent(adress)}`);
      return json({ ok: true, sparat: false });
    }

    await supaUpsert(cfg, 'prospekt_arbete', [{
      cfar,
      lista_id: listaId,
      epost: adress,
      status,
      varde_kr: varde,
      anteckning,
      ...koder,
    }], 'epost,cfar');

    return json({ ok: true, sparat: true });
  } catch (e) {
    return json({ error: 'kunde inte spara' }, 502);
  }
}
