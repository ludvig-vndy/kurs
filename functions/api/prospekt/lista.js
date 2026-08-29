/* functions/api/prospekt/lista.js  —  GET /api/prospekt/lista?slug=...

   Svarar med en prospektlistas företagsdata plus deltagarens eget arbete.
   Företagsdatan är gemensam för alla som köpt listan, arbetet är personligt.

   Åtkomst kräver två saker: en giltig pilotcookie, och ett köp som kopplar
   adressen till listan. Saknas köpet svarar vi 403 utan att avslöja om
   listan finns, så endpointen inte går att använda för att kartlägga utbudet. */

import { secureJson as json, rateLimited } from '../_lib.js';
import { pilotAdress } from '../_pilot.js';
import { supaConfig, supaGet } from '../_supa.js';

const RAD_FALT = [
  'id', 'nr', 'prio', 'foretag', 'orgnr', 'kommun', 'ort', 'postnr', 'adress',
  'verksamhet', 'anstallda_bolag', 'anstallda_arbetsstalle', 'anstallda_band',
  'omsattning_tkr', 'omsattning_ar', 'omsattning_band', 'koncernlage',
  'moderbolag', 'vd', 'telefon', 'epost', 'kanaler', 'notering',
].join(',');

const LISTA_FALT = [
  'id', 'slug', 'namn', 'ingress', 'segment', 'geografi', 'urval',
  'population', 'kallhanvisning', 'uttag_datum',
].join(',');

export async function onRequestGet(context) {
  const { request, env } = context;

  const cfg = supaConfig(env);
  if (!cfg) return json({ error: 'ej konfigurerad' }, 501);

  const limited = await rateLimited(env, request, 'prospekt-lista', 60, 2000);
  if (limited) return json({ error: limited }, 429);

  const adress = await pilotAdress(request, env);
  if (!adress) return json({ error: 'ej inloggad' }, 401);

  const slug = String(new URL(request.url).searchParams.get('slug') || '').trim();
  if (!slug) return json({ error: 'slug saknas' }, 400);

  try {
    const listor = await supaGet(cfg,
      `prospekt_lista?select=${LISTA_FALT}&slug=eq.${encodeURIComponent(slug)}&publicerad=eq.true`);
    if (!Array.isArray(listor) || !listor.length) return json({ error: 'ingen atkomst' }, 403);
    const lista = listor[0];

    // Köpet är grinden. Samma svar som när listan inte finns.
    const kop = await supaGet(cfg,
      `prospekt_kop?select=id&lista_id=eq.${lista.id}&epost=eq.${encodeURIComponent(adress)}`);
    if (!Array.isArray(kop) || !kop.length) return json({ error: 'ingen atkomst' }, 403);

    const rader = await supaGet(cfg,
      `prospekt_rad?select=${RAD_FALT}&lista_id=eq.${lista.id}&order=nr.asc&limit=5000`);

    const arbete = await supaGet(cfg,
      `prospekt_arbete?select=rad_id,status,varde_kr,anteckning` +
      `&lista_id=eq.${lista.id}&epost=eq.${encodeURIComponent(adress)}&limit=5000`);

    const minaRader = {};
    for (const a of arbete || []) {
      minaRader[a.rad_id] = { status: a.status, varde: a.varde_kr, anteckning: a.anteckning };
    }

    return json({ lista, rader: rader || [], arbete: minaRader, adress });
  } catch (e) {
    return json({ error: 'kunde inte hamta listan' }, 502);
  }
}
