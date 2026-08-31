// Mäter vår LLM-extraktion mot Börsdatas strukturerade siffror.
//
//   node tools/matning-borsdata.mjs              mäter, skriver motor/out/matning.json
//   node tools/matning-borsdata.mjs --bolag=unibap
//
// Kräver BORSDATA_API i miljön och wrangler-inloggning mot ludvig-kontot.
//
// Poängen är inte att Börsdata är facit. Poängen är att två oberoende källor som
// säger samma sak om samma period är ett belägg, och att en avvikelse pekar ut
// var vår extraktion behöver granskas. Alla avvikelser är inte fel: EBITA mot
// EBIT, antal aktier vid periodens slut mot vägt genomsnitt, och periodens
// resultat med eller utan minoritet är definitionsskillnader, inte buggar.

import { execFileSync } from 'child_process';
import { writeFileSync, mkdirSync } from 'fs';
import { pathToFileURL } from 'url';

const p = rel => new URL(rel, import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const NS = '97d78256ff664c54a724878034c8f0fd'; // KV-namespace "upptack-data"
const B = 'https://apiservice.borsdata.se/v1';

// Bolag i arkivet -> Börsdatas insId. Telia, Nokia och SSAB finns i flera
// noteringar; här står den svenska huvudnoteringen.
export const INS = {
  unibap: 1431, lifco: 440, evolution: 750, 'telia-company': 223, sectra: 200,
  axfood: 24, ferroamp: 1788, saniona: 478, 'sivers-semiconductors': 489,
  'lime-technologies': 1772, medcap: 318, nokia: 249, nyab: 1338, ssab: 695,
  truecaller: 2275,
};

/* net_Sales, inte revenues: Börsdatas revenues rymmer övriga intäkter och
   aktiverat arbete. Unibap Q1 2026 har revenues 43,736 men net_Sales 34,387,
   och det senare är nettoomsättningen rapporten själv anger. */
export const FALT = {
  omsattning:                { bd: 'net_Sales',                           sort: 'flode'  },
  rorelseresultat:           { bd: 'operating_Income',                    sort: 'flode'  },
  periodens_resultat:        { bd: 'profit_To_Equity_Holders',            sort: 'flode'  },
  kassaflode:                { bd: 'cash_Flow_From_Operating_Activities', sort: 'flode'  },
  finansieringsverksamheten: { bd: 'cash_Flow_From_Financing_Activities', sort: 'flode'  },
  kassa:                     { bd: 'cash_And_Equivalents',                sort: 'balans' },
  antal_aktier:              { bd: 'number_Of_Shares', bdSkala: 1e6,      sort: 'balans' },
};

// Vår enhet -> faktor till miljoner i rapportvalutan.
const ENHET = { Mkr: 1, MSEK: 1, mkr: 1, msek: 1, tusental: 1e-3, st: 1e-6, KSEK: 1e-3, tkr: 1e-3 };

const MAN = {
  januari: 1, februari: 2, mars: 3, april: 4, maj: 5, juni: 6, juli: 7, augusti: 8,
  september: 9, oktober: 10, november: 11, december: 12, january: 1, february: 2,
  march: 3, may: 5, june: 6, july: 7, august: 8, october: 10,
};
const NAMN = Object.keys(MAN).join('|');
// Byggs med strängkonkatenering, inte template literal: i en template literal
// blir \s bara s, och regexen letar då efter bokstaven istället för blanksteg.
const SPANN = new RegExp('(' + NAMN + ')\\s*(?:-|till|to)\\s*(' + NAMN + ')');

/* Perioden ur rubriken. Rubriken är det enda vi har: dokumentets datum i arkivet
   är insamlingsdag, inte rapportdag. */
export function period(rubrik) {
  const r = String(rubrik || '').toLowerCase().replace(/[‐-―]/g, '-');
  const brutet = r.match(/\b(20\d\d)\s*\/\s*(20\d\d)\b/);
  if (brutet) {
    const ar = +brutet[2];
    if (/nine-month|niom[aå]naders/.test(r)) return { brutet: true, ar, kvartal: [1, 2, 3] };
    if (/six-month|halv[aå]rs/.test(r))      return { brutet: true, ar, kvartal: [1, 2] };
    if (/year-end|bokslut|annual/.test(r))   return { brutet: true, ar, kvartal: [1, 2, 3, 4] };
    const q = r.match(/\bq([1-4])\b/);
    return q ? { brutet: true, ar, kvartal: [+q[1]] } : null;
  }
  const ar = (r.match(/\b(20\d\d)\b/) || [])[1];
  if (!ar) return null;
  const spann = r.match(SPANN);
  if (spann) return { ar: +ar, fran: MAN[spann[1]], till: MAN[spann[2]] };
  const q = r.match(/\bq([1-4])\b/);
  if (q) return { ar: +ar, fran: (+q[1] - 1) * 3 + 1, till: +q[1] * 3 };
  if (/bokslutskommunik|year-end|hel[aå]r|[aå]rsredovisning|annual report/.test(r))
    return { ar: +ar, fran: 1, till: 12 };
  return null;
}

/** Kvartalen ur Börsdata som perioden täcker, i tidsordning. */
export function tacktaKvartal(kvartal, p) {
  return (p.brutet
    ? kvartal.filter(q => q.year === p.ar && p.kvartal.includes(q.period))
    : kvartal.filter(q => {
        const s = new Date(q.report_Start_Date), e = new Date(q.report_End_Date);
        return s.getFullYear() === p.ar && s.getMonth() + 1 >= p.fran && e.getMonth() + 1 <= p.till;
      })
  ).sort((a, b) => new Date(a.report_End_Date) - new Date(b.report_End_Date));
}

/** Rätt siffror i fel storleksordning. Det farligaste felet av alla. */
export function arSkalfel(vart, deras) {
  return [1e3, 1e-3, 1e6, 1e-6].some(s => Math.abs(vart * s - deras) <= 0.01 * Math.abs(deras));
}

function wrangler(args) {
  return execFileSync('npx', ['--yes', 'wrangler@4', ...args], {
    encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], shell: process.platform === 'win32',
  });
}

function kvLas(nyckel) {
  try {
    const ut = wrangler(['kv', 'key', 'get', '--namespace-id=' + NS, nyckel, '--remote']);
    const i = ut.indexOf('{');
    return i === -1 ? null : JSON.parse(ut.slice(i));
  } catch { return null; }
}

async function bd(vag, nyckel) {
  const r = await fetch(B + vag + (vag.includes('?') ? '&' : '?') + 'authKey=' + nyckel);
  if (!r.ok) throw new Error(r.status + ' ' + vag);
  return r.json();
}

export async function mat({ bara } = {}) {
  const nyckel = process.env.BORSDATA_API;
  if (!nyckel) throw new Error('BORSDATA_API saknas i miljon');
  const rader = [];

  for (const [id, insId] of Object.entries(INS)) {
    if (bara && id !== bara) continue;
    const arkiv = kvLas('arkiv:' + id);
    if (!arkiv) { rader.push({ id, status: 'inget arkiv i KV' }); continue; }
    const rapporter = (arkiv.dokument || []).filter(d => d.fakta && d.typ === 'rapport');
    if (!rapporter.length) { rader.push({ id, status: 'inga fakta i arkivet' }); continue; }

    const kvartal = (await bd('/instruments/' + insId + '/reports/quarter?maxCount=40', nyckel)).reports;
    await new Promise(r => setTimeout(r, 150));   // taket ar 100 anrop per 10 sekunder

    for (const dok of rapporter) {
      const pe = period(dok.rubrik);
      if (!pe) { rader.push({ id, rubrik: dok.rubrik, status: 'okand period' }); continue; }
      const tackta = tacktaKvartal(kvartal, pe);
      if (!tackta.length) { rader.push({ id, rubrik: dok.rubrik, status: 'ingen tackning' }); continue; }
      // Börsdata levererar SEK; currency_Ratio tar oss till rapportvalutan.
      const ratio = tackta[tackta.length - 1].currency_Ratio || 1;

      for (const [falt, spec] of Object.entries(FALT)) {
        const rå = dok.fakta[falt];
        if (typeof rå?.nu !== 'number') continue;
        const f = ENHET[rå.enhet];
        if (f === undefined) { rader.push({ id, rubrik: dok.rubrik, falt, status: 'okand enhet: ' + rå.enhet }); continue; }
        const vart = rå.nu * f;

        let deras;
        if (spec.sort === 'flode') {
          const v = tackta.map(q => q[spec.bd]);
          if (v.some(x => x == null)) continue;
          deras = v.reduce((a, b) => a + b, 0);
        } else {
          deras = tackta[tackta.length - 1][spec.bd];
          if (deras == null) continue;
        }
        if (spec.bdSkala) deras *= spec.bdSkala;
        deras /= ratio;

        const rel = Math.abs(deras) > 1e-9
          ? Math.abs(vart - deras) / Math.abs(deras)
          : (Math.abs(vart) < 1e-9 ? 0 : 1);
        rader.push({
          id, rubrik: dok.rubrik, kvartal: tackta.length, falt, vart, deras, rel,
          harSida: dok.kallor?.[falt]?.sida !== undefined,
          status: rel <= 0.005 ? 'lika' : rel <= 0.05 ? 'nara' : (arSkalfel(vart, deras) ? 'SKALFEL' : 'avviker'),
        });
      }
    }
  }
  return rader;
}

async function main() {
  const bara = (process.argv.find(a => a.startsWith('--bolag=')) || '').split('=')[1];
  const rader = await mat({ bara });
  mkdirSync(p('../motor/out'), { recursive: true });
  writeFileSync(p('../motor/out/matning.json'), JSON.stringify(rader, null, 1));

  const jf = rader.filter(r => r.rel !== undefined);
  const n = s => jf.filter(r => r.status === s).length;
  console.log(`jamforda varden: ${jf.length}`);
  for (const s of ['lika', 'nara', 'SKALFEL', 'avviker']) console.log(`  ${s.padEnd(9)} ${n(s)}`);

  const med = jf.filter(r => r.harSida), utan = jf.filter(r => !r.harSida);
  const ratt = a => a.filter(r => r.status === 'lika' || r.status === 'nara').length;
  if (med.length) console.log(`\ncitat MED sidnummer:  ${ratt(med)}/${med.length}`);
  if (utan.length) console.log(`citat UTAN sidnummer: ${ratt(utan)}/${utan.length}   (kommer inte ur PDF:en)`);

  console.log('\n--- skalfel och avvikelser ---');
  for (const r of jf.filter(r => r.status === 'SKALFEL' || r.status === 'avviker').sort((a, b) => b.rel - a.rel))
    console.log((r.status === 'SKALFEL' ? '!! ' : '   ') + r.id.padEnd(22) + ' ' + r.falt.padEnd(26) +
      ' vart ' + String(Number(r.vart.toFixed(3))).padStart(13) +
      '  bd ' + String(Number(r.deras.toFixed(3))).padStart(13) + '   ' + r.rubrik.slice(0, 46));

  console.log('\n--- ej jamforda ---');
  for (const r of rader.filter(r => r.rel === undefined))
    console.log(r.id.padEnd(22) + ' ' + String(r.status).padEnd(24) + ' ' + (r.rubrik || '').slice(0, 52));
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) main();
