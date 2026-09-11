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

/* Innehaven heter som i aktieboken, Börsdata som i dagligt tal: "SSAB AB (publ)"
   mot "SSAB A". Bolagsformen skalas av före matchningen, annars faller just de
   bolag vars namn är kortast och därmed mest beroende av suffixet. */
export function skalaNamn(namn) {
  return String(namn || '')
    .toLowerCase()
    .replace(/\(publ\.?\)/g, ' ')
    .replace(/\s+(ab|abp|oyj|asa|a\/s|plc|inc|corp|holding|group)\b/g, ' ')
    .replace(/[.,]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/* Bolagsnamn -> insId. Bevakningslistan kommer ur användarnas innehav, så den
   kan inte hårdkodas. Matchningen är avsiktligt strikt: hellre inget svar än
   fel bolag. "Telia Company" matchar "Telia Company", inte "Telia2". */
export function valjInstrument(namn, instrument) {
  const n = skalaNamn(namn);
  if (!n) return null;
  const kandidater = instrument.filter(i => {
    const k = skalaNamn(i.name);
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
/* NYCKELTALEN vi hamtar, niva 1 och 2 ur matningen i motor/out/kpi-tackning.json.
   Alla femton svarade for samtliga femton provade bolag; de elva med summary
   har dessutom sex till nio ars historik.

   ALLA AR KVOTER, och det ar inte en detalj. Slaget foljer med till
   faktaregistret, dar berakningsverktyget vagrar summera kvoter. En marginal
   plus en marginal ar inget tal, och den regeln ska galla aven nar talen kommer
   fran en strukturerad kalla i stallet for ur en rapport. */
export const NYCKELTAL = [
  { kpi: 2,  namn: 'P/E',                        enhet: 'gånger',  summary: true,  median: true },
  { kpi: 10, namn: 'EV/EBIT',                    enhet: 'gånger',  summary: true,  median: true },
  { kpi: 11, namn: 'EV/EBITDA',                  enhet: 'gånger',  summary: true,  median: true },
  { kpi: 3,  namn: 'P/S',                        enhet: 'gånger',  summary: true,  median: false },
  { kpi: 4,  namn: 'P/B',                        enhet: 'gånger',  summary: true,  median: false },
  { kpi: 1,  namn: 'Direktavkastning',           enhet: 'procent', summary: true,  median: false },
  { kpi: 33, namn: 'Avkastning på eget kapital', enhet: 'procent', summary: true,  median: true },
  { kpi: 29, namn: 'Rörelsemarginal',            enhet: 'procent', summary: true,  median: true },
  { kpi: 28, namn: 'Bruttomarginal',             enhet: 'procent', summary: true,  median: false },
  { kpi: 24, namn: 'FCF-marginal',               enhet: 'procent', summary: true,  median: false },
  { kpi: 39, namn: 'Soliditet',                  enhet: 'procent', summary: true,  median: false },
  { kpi: 37, namn: 'ROIC',                       enhet: 'procent', summary: false, median: false },
  { kpi: 94, namn: 'Omsättningstillväxt',        enhet: 'procent', summary: false, median: false },
  { kpi: 97, namn: 'Vinsttillväxt',              enhet: 'procent', summary: false, median: false },
  { kpi: 42, namn: 'Nettoskuld/EBITDA',          enhet: 'gånger',  summary: false, median: false },
];

/* Hur manga avslutade ar som foljer med till faktaregistret per nyckeltal.
   Hela serien ar nio ar, men registret har ett tak pa 40 kB for HELA fragan
   och delar det med rapportutdrag, innehav och kurscitat. Tva ar racker for
   den vanligaste fragan, "hur har det utvecklats", utan att tranga ut resten. */
export const AR_TILL_REGISTRET = 2;

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
/* Ett nyckeltal ur summary-serien: senaste avslutade aret, foregaende ar, och
   medianen over fonstret nar sparren nedan slapper igenom den. */
function urSerie(rad, serie) {
  const iAr = new Date().getFullYear();
  const rena = (serie || []).filter(v => typeof v.v === 'number' && Number.isFinite(v.v));
  const historik = rena.filter(v => v.y < iAr);
  const nu = (rena.find(v => v.y === iAr) || rena[0] || {}).v;
  if (nu === undefined) return null;
  const arNu = (rena.find(v => v.y === iAr) || rena[0]).y;
  return {
    kpi: rad.kpi, namn: rad.namn, enhet: rad.enhet,
    ar: arNu, varde: avrunda(nu),
    historik: historik.slice(0, AR_TILL_REGISTRET).map(v => ({ ar: v.y, varde: avrunda(v.v) })),
    median: rad.median ? jamforbarHistorik(nu, historik) : null,
  };
}

const avrunda = v => Math.round(v * 10) / 10;

/* De fyra som inte ryms i summary kraver ett eget anrop per bolag och ger bara
   senaste vardet, ingen historik. ROIC ar vart anropet: det ar kursens
   centrala matt och var egen extraktion far det aldrig ratt. */
async function hamtaLosa(insId) {
  const ut = [];
  for (const rad of NYCKELTAL.filter(r => !r.summary)) {
    let j = null;
    try { j = await bd('/instruments/' + insId + '/kpis/' + rad.kpi + '/last/latest'); }
    catch { /* ett uteblivet nyckeltal far inte stoppa de ovriga */ }
    await paus();
    const v = j && j.value && typeof j.value.n === 'number' && Number.isFinite(j.value.n) ? j.value.n : null;
    if (v !== null) ut.push({ kpi: rad.kpi, namn: rad.namn, enhet: rad.enhet,
      ar: null, varde: avrunda(v), historik: [], median: null });
  }
  return ut;
}

/* Hela nyckeltalsbilden for ett bolag: ett summary-anrop plus fyra losa.
   Det forsta anropet gjordes redan tidigare, men elva av tolv nyckeltal i
   svaret kastades. Nu anvands de. */
export async function hamtaVardering(insId) {
  const sum = await bd('/instruments/' + insId + '/kpis/year/summary');
  if (!sum) return null;
  const serier = new Map((sum.kpis || []).map(k => [k.KpiId, k.values || []]));

  const nyckeltal = [];
  for (const rad of NYCKELTAL.filter(r => r.summary)) {
    const t = urSerie(rad, serier.get(rad.kpi));
    if (t) nyckeltal.push(t);
  }
  nyckeltal.push(...await hamtaLosa(insId));
  if (!nyckeltal.length) return null;

  /* pe behalls som eget falt: brevets befintliga rad och dess sparr ar
     oforandrade, och tva provkorningar av brevet vilar pa formen. */
  const pe = (nyckeltal.find(t => t.kpi === 2) || {}).median || null;
  const evEbitRad = nyckeltal.find(t => t.kpi === 10);
  const evEbit = evEbitRad && evEbitRad.varde > 0 ? evEbitRad.varde : null;
  return { pe, evEbit, nyckeltal };
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
