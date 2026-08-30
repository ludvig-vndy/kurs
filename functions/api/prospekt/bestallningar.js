/* functions/api/prospekt/bestallningar.js  —  intern orderbok.

   GET   /api/prospekt/bestallningar        lista alla ordrar
   POST  /api/prospekt/bestallningar        skapa en order
   PATCH /api/prospekt/bestallningar        uppdatera status eller koppla lista

   Bara för oss. Deltagarna ser aldrig den här, de får sin lista.
   Samma tabell kommer senare att fyllas av deltagaren själv, och då är det
   skapad_av som skiljer, inte modellen.

   Behörighet: adressen i pilotcookien måste finnas i ADMIN. Listan kan
   sättas via PROSPEKT_ADMIN i miljön, komma-separerat, annars gäller
   standarden nedan. */

import { secureJson as json, rateLimited } from '../_lib.js';
import { pilotAdress } from '../_lib.js';
import { supaConfig, supaGet, supaUpsert } from '../_supa.js';

const STANDARD_ADMIN = ['ludvig@vndy.se', 'sebastian@vndy.se'];
const STATUSAR = new Set(['ny', 'arbetas', 'klar', 'avvisad']);

const FALT = [
  'id', 'bestallare_epost', 'bestallare_namn', 'saljer', 'malgrupp',
  'diskvalificerar', 'sni_koder', 'lan_koder', 'storlek_koder', 'antal_onskat',
  'status', 'lista_id', 'notering', 'skapad_av', 'created_at',
].join(',');

async function admin(request, env) {
  const adress = await pilotAdress(request, env);
  if (!adress) return null;
  const lista = (env.PROSPEKT_ADMIN || '')
    .split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);
  const tillatna = lista.length ? lista : STANDARD_ADMIN;
  return tillatna.includes(adress) ? adress : null;
}

const kodlista = (v) =>
  (Array.isArray(v) ? v : String(v || '').split(','))
    .map((s) => String(s).trim())
    .filter(Boolean);

export async function onRequestGet(context) {
  const { request, env } = context;
  const cfg = supaConfig(env);
  if (!cfg) return json({ error: 'ej konfigurerad' }, 501);
  if (await admin(request, env) === null) return json({ error: 'ingen atkomst' }, 403);

  try {
    const rader = await supaGet(cfg,
      `prospekt_bestallning?select=${FALT}&order=created_at.desc&limit=200`);
    // Namnen på färdiga listor, så orderboken kan länka dit utan extra klick.
    const listId = [...new Set((rader || []).map((r) => r.lista_id).filter(Boolean))];
    let listor = [];
    if (listId.length) {
      listor = await supaGet(cfg,
        `prospekt_lista?select=id,slug,namn,publicerad&id=in.(${listId.join(',')})`);
    }
    return json({ bestallningar: rader || [], listor });
  } catch (e) {
    return json({ error: 'kunde inte hamta' }, 502);
  }
}

export async function onRequestPost(context) {
  const { request, env } = context;
  const cfg = supaConfig(env);
  if (!cfg) return json({ error: 'ej konfigurerad' }, 501);

  const limited = await rateLimited(env, request, 'prospekt-order', 30, 300);
  if (limited) return json({ error: limited }, 429);

  const jag = await admin(request, env);
  if (jag === null) return json({ error: 'ingen atkomst' }, 403);

  let b;
  try { b = await request.json(); } catch (e) { return json({ error: 'ogiltig json' }, 400); }

  const epost = String(b.bestallare_epost || '').trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(epost)) return json({ error: 'ogiltig mejladress' }, 400);

  const sni = kodlista(b.sni_koder);
  if (!sni.length || !sni.every((s) => /^\d{5}$/.test(s))) {
    return json({ error: 'sni_koder maste vara femsiffriga' }, 400);
  }

  try {
    await supaUpsert(cfg, 'prospekt_bestallning', [{
      bestallare_epost: epost,
      bestallare_namn: String(b.bestallare_namn || '').slice(0, 200) || null,
      saljer: String(b.saljer || '').slice(0, 500) || null,
      malgrupp: String(b.malgrupp || '').slice(0, 1000) || null,
      diskvalificerar: String(b.diskvalificerar || '').slice(0, 1000) || null,
      sni_koder: sni,
      lan_koder: kodlista(b.lan_koder),
      storlek_koder: kodlista(b.storlek_koder),
      antal_onskat: Number.isFinite(Number(b.antal_onskat)) && Number(b.antal_onskat) > 0
        ? Math.round(Number(b.antal_onskat)) : null,
      notering: String(b.notering || '').slice(0, 2000) || null,
      skapad_av: 'vndy:' + jag,
    }]);
    return json({ ok: true });
  } catch (e) {
    return json({ error: 'kunde inte spara' }, 502);
  }
}

export async function onRequestPatch(context) {
  const { request, env } = context;
  const cfg = supaConfig(env);
  if (!cfg) return json({ error: 'ej konfigurerad' }, 501);
  if (await admin(request, env) === null) return json({ error: 'ingen atkomst' }, 403);

  let b;
  try { b = await request.json(); } catch (e) { return json({ error: 'ogiltig json' }, 400); }

  const id = String(b.id || '').trim();
  if (!/^[0-9a-f-]{36}$/i.test(id)) return json({ error: 'ogiltigt id' }, 400);

  const patch = {};
  if (b.status !== undefined) {
    if (!STATUSAR.has(String(b.status))) return json({ error: 'ogiltig status' }, 400);
    patch.status = String(b.status);
  }
  if (b.lista_id !== undefined) {
    patch.lista_id = b.lista_id === null ? null : String(b.lista_id);
  }
  if (b.notering !== undefined) patch.notering = String(b.notering).slice(0, 2000) || null;
  if (!Object.keys(patch).length) return json({ error: 'inget att uppdatera' }, 400);

  try {
    const r = await fetch(cfg.base + '/rest/v1/prospekt_bestallning?id=eq.' + id, {
      method: 'PATCH',
      headers: { ...cfg.headers, Prefer: 'return=minimal' },
      body: JSON.stringify(patch),
    });
    if (!r.ok) throw new Error(String(r.status));
    return json({ ok: true });
  } catch (e) {
    return json({ error: 'kunde inte uppdatera' }, 502);
  }
}
