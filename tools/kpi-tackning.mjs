// Mäter Börsdatas KPI-täckning mot nivålistan vi skickade Elis.
//
//   node tools/kpi-tackning.mjs            mäter, skriver motor/out/kpi-tackning.json
//
// Kräver BORSDATA_API i miljön. Ingen KV-åtkomst behövs.
//
// Prislappen skalar med antalet KPI:er, så tre saker avgör vad vi ska begära:
// vilka som faktiskt svarar för våra bolag, vilka som ryms i ett enda
// summary-anrop (och alltså inte behöver begäras var för sig), och vilka som
// kräver ett eget anrop per bolag.

import { writeFileSync, mkdirSync } from 'fs';
import { pathToFileURL } from 'url';

const p = rel => new URL(rel, import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const B = 'https://apiservice.borsdata.se/v1';

// Bolagen i arkivet. Samma urval som tools/matning-borsdata.mjs.
export const INS = {
  unibap: 1431, lifco: 440, evolution: 750, 'telia-company': 223, sectra: 200,
  axfood: 24, ferroamp: 1788, saniona: 478, 'sivers-semiconductors': 489,
  'lime-technologies': 1772, medcap: 318, nokia: 249, nyab: 1338, ssab: 695,
  truecaller: 2275,
};

/* Nivåerna följer prioriteringen i mailet till Elis: kärnan i värdering och
   tillväxt först, kvalitetsmåtten sedan, och sist det historiska och
   framåtblickande som han beskrev som mest skyddat. */
export const LISTA = [
  { niva: 1, kpi: 2,   namn: 'P/E' },
  { niva: 1, kpi: 10,  namn: 'EV/EBIT' },
  { niva: 1, kpi: 11,  namn: 'EV/EBITDA' },
  { niva: 1, kpi: 3,   namn: 'P/S' },
  { niva: 1, kpi: 4,   namn: 'P/B' },
  // Tillvaxtmatten har ingen "last": de ar per definition en period och kraver
  // en periodgrupp. last/latest ger tomt svar, inte ett fel, vilket ser ut som
  // saknad data tills man provar ratt form.
  { niva: 1, kpi: 94,  namn: 'Omsattningstillvaxt', grupp: '1year', calc: 'mean' },
  { niva: 1, kpi: 97,  namn: 'Vinsttillvaxt',       grupp: '1year', calc: 'mean' },
  { niva: 1, kpi: 1,   namn: 'Direktavkastning' },

  { niva: 2, kpi: 37,  namn: 'ROIC' },
  { niva: 2, kpi: 33,  namn: 'Avkastning pa EK' },
  { niva: 2, kpi: 29,  namn: 'Rorelsemarginal' },
  { niva: 2, kpi: 28,  namn: 'Bruttomarginal' },
  { niva: 2, kpi: 24,  namn: 'FCF-marginal' },
  { niva: 2, kpi: 42,  namn: 'Nettoskuld/EBITDA' },
  { niva: 2, kpi: 39,  namn: 'Soliditet' },

  // Nivå 3 är inte egna nyckeltal utan djup: samma tal, bakåt i tiden.
  { niva: 3, kpi: 2,   namn: 'P/E, 10 ars snitt',        grupp: '10year', calc: 'mean' },
  { niva: 3, kpi: 10,  namn: 'EV/EBIT, 5 ars snitt',     grupp: '5year',  calc: 'mean' },
  { niva: 3, kpi: 94,  namn: 'Omsattning, 5 ars CAGR',   grupp: '5year',  calc: 'cagr' },
  { niva: 3, kpi: 37,  namn: 'ROIC, 5 ars snitt',        grupp: '5year',  calc: 'mean' },

  // Sådant Börsdata har som listan inte bad om, men som produkten vill ha.
  // Insyn, blankning och återköp finns, men under /holdings/*, inte som KPI:er:
  // KPI 240, 210 och 213 svarar med null för samtliga bolag. Ägarbilden (KPI 247)
  // svarar null överallt och finns inte i API:et i någon form.
  { niva: 4, kpi: 201, namn: 'Nasta rapportdatum' },
  { niva: 4, kpi: 167, namn: 'F-Score' },
  { niva: 4, kpi: 247, namn: 'Storsta agare' },
];

async function bd(vag, nyckel) {
  const r = await fetch(B + vag + (vag.includes('?') ? '&' : '?') + 'authKey=' + nyckel);
  if (!r.ok) return { fel: r.status };
  return r.json();
}

/** Ett KPI för ett bolag. Utan grupp/calc tas senaste värdet. */
async function hamtaKpi(insId, rad, nyckel) {
  const grupp = rad.grupp || 'last';
  const calc = rad.calc || 'latest';
  const j = await bd('/instruments/' + insId + '/kpis/' + rad.kpi + '/' + grupp + '/' + calc, nyckel);
  if (j.fel) return { status: 'HTTP ' + j.fel };
  const v = j.value;
  if (!v) return { status: 'tomt' };
  // Textvärden (ägarnamn, datum) ligger i s, tal i n.
  const varde = v.n ?? v.s;
  return varde === null || varde === undefined ? { status: 'tomt' } : { status: 'varde', varde };
}

export async function mat() {
  const nyckel = process.env.BORSDATA_API;
  if (!nyckel) throw new Error('BORSDATA_API saknas i miljon');

  /* Summary forst, ett anrop per bolag. Det ar inte bara billigare utan ocksa
     riktigare: last/latest svarar null nar arets varde ar noll, sa Evolutions
     direktavkastning ser ut att saknas trots att serien finns och visar 3,89
     procent for 2024. Nollan ar ett varde, inte ett tomrum. */
  const summary = {};
  for (const [id, insId] of Object.entries(INS)) {
    const j = await bd('/instruments/' + insId + '/kpis/year/summary', nyckel);
    summary[id] = new Map((j.kpis || []).map(k => [k.KpiId, k.values || []]));
    await new Promise(r => setTimeout(r, 130));
  }
  const iSummary = new Set([...(summary.lifco || new Map()).keys()]);

  const rader = [];
  for (const rad of LISTA) {
    const franSummary = !rad.grupp && iSummary.has(rad.kpi);
    const utfall = [];
    for (const [id, insId] of Object.entries(INS)) {
      if (franSummary) {
        const serie = (summary[id].get(rad.kpi) || []).filter(v => v.v !== null && v.v !== undefined);
        utfall.push(serie.length
          ? { id, status: 'varde', varde: serie[0].v, ar: serie[0].y, punkter: serie.length }
          : { id, status: 'tomt' });
      } else {
        utfall.push({ id, ...(await hamtaKpi(insId, rad, nyckel)) });
        await new Promise(r => setTimeout(r, 130));
      }
    }
    rader.push({
      ...rad, iSummary: franSummary,
      trafar: utfall.filter(u => u.status === 'varde').length,
      av: utfall.length,
      // Hur djup historiken ar, minst av bolagen, for de KPI:er summary bar.
      djup: franSummary ? Math.min(...utfall.map(u => u.punkter || 0)) : null,
      utfall,
    });
  }
  return { rader, summaryAntal: iSummary.size };
}

async function main() {
  const { rader, summaryAntal } = await mat();
  mkdirSync(p('../motor/out'), { recursive: true });
  writeFileSync(p('../motor/out/kpi-tackning.json'), JSON.stringify(rader, null, 1));

  console.log('Summary-anropet ger ' + summaryAntal + ' KPI:er med hel historik, ett anrop per bolag.\n');
  let niva = 0;
  for (const r of rader) {
    if (r.niva !== niva) {
      niva = r.niva;
      const rubrik = { 1: 'NIVA 1, vardering och tillvaxt', 2: 'NIVA 2, kvalitet',
        3: 'NIVA 3, historiskt djup', 4: 'UTANFOR LISTAN, men finns' }[niva];
      console.log('\n' + rubrik);
      console.log("  " + "kpi".padEnd(28) + "traffar".padEnd(10) + "kalla".padEnd(12) + "djup");
    }
    const andel = r.trafar + '/' + r.av;
    console.log('  ' + r.namn.padEnd(28) + andel.padEnd(10) +
      (r.iSummary ? 'summary' : 'eget anrop').padEnd(12) +
      (r.djup ? r.djup + ' ar historik (minst)' : ''));
  }

  const saknas = rader.filter(r => r.trafar < r.av);
  if (saknas.length) {
    console.log('\nOfullstandig tackning:');
    for (const r of saknas)
      console.log('  ' + r.namn.padEnd(28) + 'saknas for: ' +
        r.utfall.filter(u => u.status !== 'varde').map(u => u.id).join(', '));
  }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) main();
