// Eval-selen: kör LLM-extraktionen mot samma fixturer och facit som de
// deterministiska adaptrarna, per modell, och räknar rättprocent, kostnad och
// tid. Det är den här tabellen som väljer modell, inte tyckande.
//
// Kör: node motor/eval-llm.mjs --torr                    utan nycklar: deterministiska
//                                                        extraktorerna spelar LLM, bevisar selen
//      node motor/eval-llm.mjs --modell gpt-5.4-mini     riktig körning (kräver nyckel)
//      node motor/eval-llm.mjs --modell gpt-5.4-mini --modell claude-haiku   jämförelse

import { readFileSync } from 'fs';
import { extrahera } from './extract.mjs';
import { extraheraLifco } from './extract-lifco.mjs';
import { extraheraKallelse } from './extract-kallelse.mjs';
import { extraheraAvtal } from './extract-avtal.mjs';
import { extraheraLLM, klassificeraAvtalLLM } from './extract-llm.mjs';
import { nyckelFinns } from './llm.mjs';

const p = rel => new URL(rel, import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const läs = f => readFileSync(p(f), 'utf8');
const facit = f => JSON.parse(läs(f));

// Fältlistor: id + beskrivning. Det här ÄR schemat modellen extraherar mot.
const KALLOR = [
  {
    namn: 'norlux', typ: 'siffror',
    text: () => läs('./fixtures/norlux-q3-2026.txt'),
    facit: () => facit('./fixtures/norlux-facit.json').fakta,
    torr: t => extrahera(t).fakta,
    falt: [
      { id: 'omsattning', beskrivning: 'Nettoomsättning för kvartalet, med fjolårsvärdet i parentesen', enhet: 'Mkr' },
      { id: 'organisk_tillvaxt', beskrivning: 'Organisk tillväxt i procent, med fjolårets i parentesen', enhet: '%' },
      { id: 'bruttomarginal', beskrivning: 'Bruttomarginal i procent, med fjolårets i parentesen', enhet: '%' },
      { id: 'ebit', beskrivning: 'Rörelseresultat EBIT, med fjolårets i parentesen', enhet: 'Mkr' },
      { id: 'ebit_marginal', beskrivning: 'EBIT-marginal i procent, med fjolårets i parentesen', enhet: '%' },
      { id: 'fritt_kassaflode', beskrivning: 'Fritt kassaflöde, med fjolårets i parentesen', enhet: 'Mkr' },
      { id: 'nettoskuld_ebitda', beskrivning: 'Nettoskuld genom EBITDA, gånger, med fjolårets i parentesen', enhet: 'x' },
      { id: 'antal_aktier', beskrivning: 'Antal aktier i miljoner, med fjolårets i parentesen', enhet: 'M' }
    ]
  },
  {
    namn: 'lifco', typ: 'siffror',
    text: () => läs('../docs/case-sources/fall-lifco-2025.md'),
    facit: () => facit('./fixtures/lifco-fy2025-facit.json').fakta,
    torr: t => extraheraLifco(t).fakta,
    falt: [
      { id: 'omsattning', beskrivning: 'Omsättning helåret i miljoner SEK, fjolåret i parentesen', enhet: 'Mkr' },
      { id: 'omsattning_rapporterad_yoy', beskrivning: 'Omsättningens rapporterade tillväxt i procent (ordet "upp")', enhet: '%' },
      { id: 'organisk_tillvaxt', beskrivning: 'Organisk tillväxt i procent (ordet "organiskt")', enhet: '%' },
      { id: 'valutaeffekt', beskrivning: 'Valutaeffektens storlek i procent (drog ned omsättningen med)', enhet: '%' },
      { id: 'ebita', beskrivning: 'EBITA i miljoner SEK, fjolåret i parentesen', enhet: 'Mkr' },
      { id: 'ebita_rapporterad_yoy', beskrivning: 'EBITA:s rapporterade tillväxt i procent', enhet: '%' },
      { id: 'ebita_marginal', beskrivning: 'EBITA-marginal i procent, fjolåret i parentesen', enhet: '%' },
      { id: 'resultat_fore_skatt', beskrivning: 'Resultat före skatt i miljoner SEK', enhet: 'Mkr' },
      { id: 'nettoresultat', beskrivning: 'Nettoresultat i miljoner SEK', enhet: 'Mkr' },
      { id: 'vpa', beskrivning: 'Vinst per aktie i SEK', enhet: 'kr' },
      { id: 'kassaflode_lopande', beskrivning: 'Kassaflöde från löpande verksamhet i miljoner SEK, fjolåret i parentesen', enhet: 'Mkr' },
      { id: 'fkf_per_aktie', beskrivning: 'Fritt kassaflöde per aktie i SEK', enhet: 'kr' },
      { id: 'roce_ex_goodwill', beskrivning: 'Avkastning på sysselsatt kapital exklusive goodwill, procent', enhet: '%' },
      { id: 'nettoskuld', beskrivning: 'Räntebärande nettoskuld i miljoner SEK', enhet: 'Mkr' },
      { id: 'rantebarande_ns_ebitda', beskrivning: 'Räntebärande nettoskuld genom EBITDA, gånger, fjolåret i parentesen', enhet: 'x' },
      { id: 'antal_forvarv', beskrivning: 'Antal konsoliderade förvärv under året', enhet: 'st' },
      { id: 'utdelning', beskrivning: 'Föreslagen utdelning per aktie i SEK', enhet: 'kr' },
      { id: 'pris_rapportdag', beskrivning: 'Aktiekursen på rapportdagen i SEK', enhet: 'kr' }
    ]
  },
  {
    namn: 'kallelse', typ: 'siffror',
    text: () => läs('./fixtures/voltcell-kallelse-2026.txt'),
    facit: () => facit('./fixtures/voltcell-kallelse-facit.json').fakta,
    torr: t => extraheraKallelse(t).fakta,
    falt: [
      { id: 'antal_aktier', beskrivning: 'Totalt antal aktier och röster i bolaget', enhet: 'st' },
      { id: 'bemyndigande_aktier', beskrivning: 'Högsta antal aktier i emissionsbemyndigandet', enhet: 'st' },
      { id: 'bemyndigande_andel_uppgiven', beskrivning: 'Kallelsens egen cirka-procent för bemyndigandet', enhet: '%' },
      { id: 'konvertibel_nominellt', beskrivning: 'Konvertibellånets nominella belopp i kronor', enhet: 'kr' },
      { id: 'konverteringskurs', beskrivning: 'Konverteringskursen i kronor per aktie', enhet: 'kr' },
      { id: 'konvertibel_aktier_uppgivna', beskrivning: 'Uppgivet antal nya aktier vid full konvertering', enhet: 'st' },
      { id: 'optioner_antal', beskrivning: 'Antal utestående teckningsoptioner', enhet: 'st' },
      { id: 'teckningskurs', beskrivning: 'Teckningsoptionernas teckningskurs i kronor', enhet: 'kr' }
    ]
  }
];

const AVTAL = {
  namn: 'avtal', typ: 'klasser',
  text: () => läs('./fixtures/voltcell-pm-2026.txt'),
  facit: () => facit('./fixtures/voltcell-pm-facit.json').klasser,
  pmLista(t) {
    return t.split(/=== PM (\d+) ===/).slice(1).reduce((a, v, i, arr) => {
      if (i % 2 === 0) a.push({ id: 'pm' + v, text: arr[i + 1].trim() });
      return a;
    }, []);
  },
  torr(t) {
    return extraheraAvtal(t).pm.map(x => ({ id: x.id, klass: x.klass }));
  }
};

function jamforSiffror(fick, ratt) {
  let ok = 0, fel = [];
  let total = 0;
  for (const [id, f] of Object.entries(ratt)) {
    total++;
    const e = fick[id];
    if (!e) { fel.push(`${id}: saknas`); continue; }
    if (e.nu !== f.nu) { fel.push(`${id}: nu ${e.nu} != ${f.nu}`); continue; }
    if (f.fjol != null && e.fjol !== f.fjol) { fel.push(`${id}: fjol ${e.fjol} != ${f.fjol}`); continue; }
    ok++;
  }
  return { ok, total, fel };
}

async function korModell(modellnamn, torr) {
  const rader = [];
  let totKostnad = 0;

  for (const k of KALLOR) {
    // Torrläget evaluerar bara de fält som ingår i LLM-fältlistan, för rättvis jämförelse.
    const faltIds = new Set(k.falt.map(f => f.id));
    const ratt = Object.fromEntries(Object.entries(k.facit()).filter(([id]) => faltIds.has(id)));
    const t0 = Date.now();
    let fick, kostnad = 0, extraFel = [];
    if (torr) fick = k.torr(k.text());
    else {
      const r = await extraheraLLM(k.text(), k.falt, modellnamn);
      fick = r.fakta; kostnad = r.kostnad_usd; extraFel = r.fel;
    }
    const j = jamforSiffror(fick, ratt);
    totKostnad += kostnad;
    rader.push({ kalla: k.namn, ok: j.ok, total: j.total, ms: Date.now() - t0, kostnad, fel: [...j.fel, ...extraFel] });
  }

  // Avtalsklassningen
  {
    const ratt = AVTAL.facit();
    const t0 = Date.now();
    let klassningar, kostnad = 0;
    if (torr) klassningar = AVTAL.torr(AVTAL.text());
    else {
      const r = await klassificeraAvtalLLM(AVTAL.pmLista(AVTAL.text()), modellnamn);
      klassningar = r.klassningar; kostnad = r.kostnad_usd;
    }
    let ok = 0; const fel = [];
    for (const [id, klass] of Object.entries(ratt)) {
      const f = klassningar.find(x => x.id === id);
      if (f && f.klass === klass) ok++;
      else fel.push(`${id}: fick "${f ? f.klass : 'inget'}", väntade "${klass}"`);
    }
    totKostnad += kostnad;
    rader.push({ kalla: AVTAL.namn, ok, total: Object.keys(ratt).length, ms: Date.now() - t0, kostnad, fel });
  }

  return { rader, totKostnad };
}

// ── körning ──────────────────────────────────────────────────────────────────
const torr = process.argv.includes('--torr');
const valda = process.argv.flatMap((a, i) => a === '--modell' ? [process.argv[i + 1]] : []);
const modeller = torr ? ['(torr: deterministiska extraktorerna)'] : valda.length ? valda : ['gpt-5.4-mini'];

if (!torr) for (const m of modeller) {
  if (!nyckelFinns(m)) { console.error(`Nyckel saknas för ${m}. Kör med --torr, eller sätt nyckeln i miljön.`); process.exit(1); }
}

console.log(`\n=== EVAL: extraktion mot facit${torr ? ' · TORRLÄGE' : ''} ===`);
let sammanlagt = 0, ratta = 0;
for (const m of modeller) {
  const { rader, totKostnad } = await korModell(m, torr);
  console.log(`\nModell: ${m}`);
  for (const r of rader) {
    console.log(`  ${r.kalla.padEnd(10)} ${String(r.ok).padStart(2)}/${r.total}  ${String(r.ms).padStart(6)} ms  $${r.kostnad.toFixed(4)}`);
    for (const f of r.fel) console.log(`      FEL: ${f}`);
    sammanlagt += r.total; ratta += r.ok;
  }
  console.log(`  kostnad totalt: $${totKostnad.toFixed(4)}`);
}
console.log(`\n${ratta === sammanlagt ? 'PASS' : 'FAIL'}: ${ratta}/${sammanlagt} värden korrekta.`);
if (ratta !== sammanlagt) process.exitCode = 1;
