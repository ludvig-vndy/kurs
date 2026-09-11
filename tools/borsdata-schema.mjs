// Vilka fält Börsdatas kvartalsrapporter faktiskt bär, och i vilken skala.
//
//   node tools/borsdata-schema.mjs            läser, skriver en tabell
//
// Kräver BORSDATA_API i miljön. Ingen KV-åtkomst, ingen modell, ingen skrivning.
//
// Varför den finns: RAKENSKAPSFALT i motor/borsdata.mjs innehåller bara de
// fältnamn som redan var verifierade i vigilans-ingesten. Fler finns nästan
// säkert i svaret, men att gissa ett fältnamn i kod som faller tyst betyder att
// felet aldrig upptäcks. Den här sonden hämtar sanningen i stället, så listan
// kan utökas på ett belägg.
//
// Den kontrollerar också det som inte går att läsa ur ett fältnamn: valutan per
// bolag och storleksordningen. Vår egen extraktion märkte eurobelopp som Mkr och
// hade 25 rena skalfel av 131 jämförelser, så båda måste ses, inte antas.

import { pathToFileURL } from 'url';

const B = 'https://apiservice.borsdata.se/v1';
const PAUS = 150;
const paus = () => new Promise(r => setTimeout(r, PAUS));

// Ett svenskt, ett med euro och ett litet. Skillnaden i valuta och storlek är
// själva poängen: ett fält som finns för Volvo kan vara null för Unibap.
const PROV = [
  { namn: 'Volvo', insId: 1027 },
  { namn: 'Lifco', insId: 440 },
  { namn: 'Unibap', insId: 1431 },
];

async function bd(vag, nyckel) {
  const r = await fetch(B + vag + (vag.includes('?') ? '&' : '?') + 'authKey=' + nyckel);
  if (!r.ok) throw new Error('Börsdata svarade ' + r.status + ' på ' + vag.split('?')[0]);
  return r.json();
}

const sort = v => v === null || v === undefined ? 'tomt'
  : typeof v === 'number' ? (Number.isInteger(v) ? 'heltal' : 'decimal') : typeof v;

export async function sondera(nyckel) {
  const instrument = (await bd('/instruments', nyckel)).instruments || [];
  await paus();
  const ut = [];
  for (const p of PROV) {
    const i = instrument.find(x => x.insId === p.insId);
    const j = await bd('/instruments/' + p.insId + '/reports/quarter?maxCount=4', nyckel);
    await paus();
    const rapporter = j.reports || j.reportsQuarter || [];
    const senaste = [...rapporter].sort((a, b) => (b.year - a.year) || (b.period - a.period))[0] || {};
    ut.push({
      namn: p.namn,
      // Valutan är det enda som avgör om ett belopp får heta MSEK eller MEUR.
      reportCurrency: i && i.reportCurrency, stockPriceCurrency: i && i.stockPriceCurrency,
      kvartal: rapporter.length,
      period: senaste.year ? senaste.year + 'Q' + senaste.period : null,
      falt: Object.fromEntries(Object.entries(senaste).map(([k, v]) => [k, { sort: sort(v), varde: v }])),
    });
  }
  return ut;
}

async function main() {
  const nyckel = process.env.BORSDATA_API;
  if (!nyckel) { console.error('BORSDATA_API saknas i miljon.'); process.exit(1); }
  const bolag = await sondera(nyckel);

  for (const b of bolag) {
    console.log(`\n${b.namn}: ${b.kvartal} kvartal, senast ${b.period}, ` +
      `reportCurrency=${b.reportCurrency ?? 'SAKNAS'} stockPriceCurrency=${b.stockPriceCurrency ?? 'SAKNAS'}`);
  }

  // Ett fält per rad, med värdet för varje bolag. Det gör både namnet och
  // storleksordningen läsbar i samma blick: står Volvos omsättning i
  // hundratusental är talen inte miljoner, och då är hela enhetsvalet fel.
  const alla = [...new Set(bolag.flatMap(b => Object.keys(b.falt)))].sort();
  console.log('\n' + 'fält'.padEnd(34) + bolag.map(b => b.namn.padEnd(18)).join(''));
  for (const f of alla) {
    const celler = bolag.map(b => {
      const c = b.falt[f];
      return (c ? (c.sort === 'tomt' ? 'tomt' : String(c.varde)) : '-').slice(0, 17).padEnd(18);
    });
    console.log(f.padEnd(34) + celler.join(''));
  }

  console.log('\nAnvands redan i motor/borsdata.mjs: revenues, gross_Income, free_Cash_Flow,');
  console.log('cash_And_Equivalents, net_Debt, number_Of_Shares.');
  console.log('Lagg bara till falt som star med ett rimligt varde for FLERA bolag ovan.');
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) main();
