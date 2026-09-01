/* functions/api/prospekt/lista.js  —  GET /api/prospekt/lista?slug=...

   Svarar med en prospektlistas företagsdata plus deltagarens eget arbete.
   Företagsdatan är gemensam för alla som köpt listan, arbetet är personligt.

   Åtkomst kräver två saker: en giltig pilotcookie, och ett köp som kopplar
   adressen till listan. Saknas köpet svarar vi 403 utan att avslöja om
   listan finns, så endpointen inte går att använda för att kartlägga utbudet. */

import { secureJson as json, rateLimited } from '../_lib.js';
import { pilotAdress } from '../_lib.js';
import { supaConfig, supaGet } from '../_supa.js';

const BOLAG_FALT = [
  'id', 'orgnr', 'nr', 'prio', 'foretag', 'verksamhet',
  'anstallda', 'anstallda_band', 'omsattning_tkr', 'omsattning_ar', 'omsattning_band',
  'koncernlage', 'moderbolag', 'moderbolag_orgnr', 'koncern_nyckel',
  'kontakt_namn', 'kontakt_roll', 'kontakt_kalla', 'kontakt_datum',
  'hemsida', 'telefon', 'telefon_kalla', 'epost', 'kanaler', 'notering',
].join(',');

const STALLE_FALT = [
  'bolag_id', 'cfar', 'huvudkontor', 'kommun', 'ort', 'postnr', 'adress',
  'anstallda_klass', 'telefon', 'kanaler',
].join(',');

const ARBETE_FALT = [
  'orgnr', 'status', 'varde_kr', 'anteckning', 'nasta_steg', 'nasta_datum',
  'verifierad_namn', 'verifierad_titel', 'verifierad_kalla', 'verifierad_datum',
  'kontaktresultat', 'orsak', 'listfel',
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

    const bolag = await supaGet(cfg,
      `prospekt_bolag?select=${BOLAG_FALT}&lista_id=eq.${lista.id}&order=nr.asc&limit=5000`);

    // Arbetsställena hänger under bolaget. De visas, men de är aldrig egna
    // prospekt: en kedja är ett prospekt med många adresser, inte många.
    const stallen = await supaGet(cfg,
      `prospekt_arbetsstalle?select=${STALLE_FALT}&lista_id=eq.${lista.id}` +
      `&order=huvudkontor.desc,ort.asc&limit=20000`);
    const perBolag = {};
    for (const st of stallen || []) (perBolag[st.bolag_id] ||= []).push(st);
    for (const b of bolag || []) b.stallen = perBolag[b.id] || [];

    // Arbetet hämtas på orgnr, inte på lista. Har deltagaren pratat med ett
    // bolag i en annan lista följer anteckningen med hit.
    const orgnr = (bolag || []).map((b) => b.orgnr).filter(Boolean);
    const arbete = orgnr.length
      ? await supaGet(cfg,
          `prospekt_arbete?select=${ARBETE_FALT}` +
          `&epost=eq.${encodeURIComponent(adress)}` +
          `&orgnr=in.(${orgnr.map((o) => '"' + o + '"').join(',')})&limit=5000`)
      : [];

    const mitt = {};
    for (const a of arbete || []) {
      mitt[a.orgnr] = {
        status: a.status, varde: a.varde_kr, anteckning: a.anteckning,
        nasta: a.nasta_steg, nastaDatum: a.nasta_datum,
        verifierad: a.verifierad_namn ? {
          namn: a.verifierad_namn, titel: a.verifierad_titel,
          kalla: a.verifierad_kalla, datum: a.verifierad_datum,
        } : null,
        kontaktresultat: a.kontaktresultat, orsak: a.orsak, listfel: a.listfel,
      };
    }

    return json({ lista, bolag: bolag || [], arbete: mitt, adress });
  } catch (e) {
    return json({ error: 'kunde inte hamta listan' }, 502);
  }
}
