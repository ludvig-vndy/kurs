// Börsdata i morgonbrevet: rapportkalendern och värderingen mot bolagets egen
// historik. Två saker som inte behöver en händelse för att vara sanna, och som
// därför fyller den lucka brevet har på en lugn dag.
//
// Faller alltid tyst. Utan nyckel i miljön returnerar allt här null och
// nattjobbet kör precis som förut. Ett uteblivet stycke är bättre än ett fel.
//
// Sifferpolicyn gäller: talen kommer ur API:et, jämförelsen räknas i kod, och
// prosan får aldrig räkna själv.
//
// LICENS, LÄS DETTA FÖRE LANSERING. Nyckeln vi kör på är en retail-nyckel
// (Börsdata Pro, provperiod). Enligt LAUNCH.md:s första P0 får retail-data inte
// visas för betalande kunder; skarp tjänst kräver Enterprise. Piloterna är inte
// betalande kunder, så utvärdering är i sin ordning, men det här blocket måste
// stängas av eller licensen uppgraderas innan någon betalar för brevet.
//
// Nyckelnamn: BORSDATA_API är det som ligger i .env. motor/vigilans/
// ingest-borsdata.mjs läser BORSDATA_API_KEY. Båda godtas här tills de slagits
// ihop, så att en körning inte tystnar för att namnet skiljer sig.

import { pathToFileURL } from 'url';

const B = 'https://apiservice.borsdata.se/v1';
const KPI_PE = 2;
const KPI_EV_EBIT = 10;

// Taket är 100 anrop per 10 sekunder. Nattjobbet har gott om tid, så vi går
// lugnt fram hellre än att riskera en 429 mitt i en körning.
const PAUS = 140;
const paus = () => new Promise(r => setTimeout(r, PAUS));

export function apiNyckel() {
  return process.env.BORSDATA_API || process.env.BORSDATA_API_KEY || null;
}

export function nyckelFinns() {
  return Boolean(apiNyckel());
}

async function bd(vag) {
  const nyckel = apiNyckel();
  if (!nyckel) return null;
  const r = await fetch(B + vag + (vag.includes('?') ? '&' : '?') + 'authKey=' + nyckel);
  if (!r.ok) throw new Error('Börsdata svarade ' + r.status + ' på ' + vag.split('?')[0]);
  return r.json();
}

/* Bolagsnamn -> insId. Bevakningslistan kommer ur användarnas innehav, så den
   kan inte hårdkodas. Matchningen är avsiktligt strikt: hellre inget svar än
   fel bolag. "Telia Company" matchar "Telia Company", inte "Telia2". */
export function valjInstrument(namn, instrument) {
  const n = String(namn || '').toLowerCase().trim();
  if (!n) return null;
  const kandidater = instrument.filter(i => {
    const k = i.name.toLowerCase();
    return k === n || k.startsWith(n + ' ') || n.startsWith(k + ' ') || k === n.split(' ')[0];
  });
  if (!kandidater.length) return null;
  // Flera noteringar av samma bolag (A- och B-aktier, svensk och finsk lista):
  // ta den med kortast namn och lägst insId, alltså huvudnoteringen.
  return kandidater.sort((a, b) =>
    a.name.length - b.name.length || a.insId - b.insId)[0];
}

export async function hamtaInstrument() {
  const j = await bd('/instruments');
  return j ? j.instruments || [] : [];
}

/** Nästa rapportdatum per insId, för de bolag som har ett framtida datum. */
export async function hamtaKalender(insIder, idag = new Date()) {
  if (!insIder.length) return {};
  const j = await bd('/instruments/report/calendar?instList=' + insIder.join(','));
  if (!j) return {};
  const ut = {};
  for (const b of j.list || []) {
    const kommande = (b.values || [])
      .filter(v => new Date(v.releaseDate) >= idag)
      .sort((a, c) => new Date(a.releaseDate) - new Date(c.releaseDate))[0];
    if (!kommande) continue;
    const dag = kommande.releaseDate.slice(0, 10);
    ut[b.insId] = {
      datum: dag,
      typ: kommande.reportType,
      dagar: Math.round((new Date(dag + 'T12:00:00') - new Date(idag.toISOString().slice(0, 10) + 'T12:00:00')) / 864e5),
    };
  }
  return ut;
}

/* SPÄRREN.
   P/E mot sitt eget historiska snitt är bara meningsfullt när bolaget tjänat
   pengar hela vägen. Saniona ger annars "387 procent under snittet" (8,6 mot
   -3,0), Sivers "123 procent över" (-32,0 mot -14,4), och MedCaps tioårssnitt
   på 221 är förstört av ett enda förlustår. Talen ser auktoritativa ut och
   betyder ingenting.

   Regeln: nuvarande tal positivt, minst fem avslutade år i fönstret, och varje
   år i fönstret positivt.

   Och median, inte medelvärde. Ett år med nästan noll i vinst ger ett enormt
   men fullt positivt P/E som spärren ovan släpper igenom: MedCap står på 1830
   för 2018, vilket lyfter tioårssnittet till 220 och får dagens 35 att se ut
   som åttiofyra procent under det normala. Medianen för samma tio år är 35,
   alltså precis där bolaget står. Medianen räknas här i kod, inte av Börsdata
   och inte av en modell, så vi vet exakt vad som ingår. */
export const MIN_AR = 5;
export const FONSTER = 10;

export function median(tal) {
  const s = [...tal].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

export function jamforbarHistorik(nu, serie, { minAr = MIN_AR, fonster = FONSTER } = {}) {
  if (typeof nu !== 'number' || !(nu > 0)) return null;
  const ar = (serie || [])
    .filter(v => typeof v.v === 'number')
    .sort((a, b) => b.y - a.y)
    .slice(0, fonster);
  if (ar.length < minAr) return null;
  if (ar.some(v => !(v.v > 0))) return null;
  const mitt = median(ar.map(v => v.v));
  if (!(mitt > 0)) return null;
  return {
    nu: Math.round(nu * 10) / 10,
    median: Math.round(mitt * 10) / 10,
    ar: ar.length,
    fran: ar[ar.length - 1].y,
    till: ar[0].y,
    avvikelse: Math.round((nu / mitt - 1) * 100),
  };
}

/** Värderingen för ett bolag, eller null om den inte går att jämföra ärligt. */
export async function hamtaVardering(insId) {
  const sum = await bd('/instruments/' + insId + '/kpis/year/summary');
  if (!sum) return null;
  const serie = id => ((sum.kpis || []).find(k => k.KpiId === id) || {}).values || [];

  // Innevarande år är en pågående period och hör inte hemma i historiken.
  const iAr = new Date().getFullYear();
  const historik = serie(KPI_PE).filter(v => v.y < iAr);
  const nu = (serie(KPI_PE).find(v => v.y === iAr) || serie(KPI_PE)[0] || {}).v;

  const pe = jamforbarHistorik(nu, historik);
  if (!pe) return null;
  const evEbit = (serie(KPI_EV_EBIT)[0] || {}).v;
  return { pe, evEbit: typeof evEbit === 'number' && evEbit > 0 ? Math.round(evEbit * 10) / 10 : null };
}

/* Hela blocket för brevet: en rad per bolag med nästa rapport, och värdering
   där den är jämförbar. Kastar aldrig: ett trasigt Börsdata ska inte kunna
   stoppa morgonbrevet. */
export async function byggBorsdata(bolagsnamn, { idag = new Date(), tyst = false } = {}) {
  if (!nyckelFinns()) return { av: 'ingen nyckel', rader: [] };
  try {
    const instrument = await hamtaInstrument();
    const traffar = bolagsnamn
      .map(namn => ({ namn, i: valjInstrument(namn, instrument) }))
      .filter(t => t.i);
    const kalender = await hamtaKalender(traffar.map(t => t.i.insId), idag);
    await paus();

    const rader = [];
    for (const t of traffar) {
      let vardering = null;
      try { vardering = await hamtaVardering(t.i.insId); } catch { /* hoppa bolaget */ }
      await paus();
      const k = kalender[t.i.insId] || null;
      if (k || vardering) rader.push({ bolag: t.namn, kalender: k, vardering });
    }
    rader.sort((a, b) => (a.kalender?.dagar ?? 9e9) - (b.kalender?.dagar ?? 9e9));
    const utan = bolagsnamn.filter(n => !traffar.some(t => t.namn === n));
    if (!tyst && utan.length) console.log(`  börsdata: ingen träff för ${utan.join(', ')}`);
    return { av: null, rader };
  } catch (e) {
    if (!tyst) console.log(`  börsdata: hoppas över (${e.message.slice(0, 90)})`);
    return { av: e.message, rader: [] };
  }
}

async function main() {
  const namn = process.argv.slice(2);
  if (!namn.length) { console.log('Ange bolagsnamn: node motor/borsdata.mjs Lifco Evolution'); return; }
  const { av, rader } = await byggBorsdata(namn);
  if (av) { console.log('Av: ' + av); return; }
  for (const r of rader) {
    const k = r.kalender ? `${r.kalender.datum} ${r.kalender.typ}, om ${r.kalender.dagar} dagar` : 'inget datum';
    const v = r.vardering
      ? `P/E ${r.vardering.pe.nu} mot median ${r.vardering.pe.median} (${r.vardering.pe.ar} ar), ${r.vardering.pe.avvikelse > 0 ? '+' : ''}${r.vardering.pe.avvikelse}%`
      : 'ej jamforbar';
    console.log(r.bolag.padEnd(24) + k.padEnd(38) + v);
  }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) main();
