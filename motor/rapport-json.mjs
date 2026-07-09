// Wira motorn -> Rapportkollen-ytan UTAN API-nycklar.
// Kör den deterministiska pipelinen (samma adaptrar som run.mjs) och skriver en
// strukturerad JSON-analys som Rapportkollen-mocken kan hämta och rendera.
// Bevisar motor -> UI: riktig, grindad analys av riktig data i ytan.
//
// Kör: node motor/rapport-json.mjs [lifco|norlux]   (default: lifco)
// Skriver: public/labs/data/rapport-<key>.json

import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { extrahera } from './extract.mjs';
import { berakna } from './compute.mjs';
import { narrera } from './narrate.mjs';
import { extraheraLifco } from './extract-lifco.mjs';
import { beraknaLifco } from './compute-lifco.mjs';
import { narreraLifco } from './narrate-lifco.mjs';
import { verifiera } from './verify.mjs';

const p = (rel) => new URL(rel, import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');

const ADAPTRAR = {
  norlux: {
    kalla: p('./fixtures/norlux-q3-2026.txt'),
    facit: p('./fixtures/norlux-facit.json'),
    kallText: 'fixtures/norlux-q3-2026.txt (fiktiv, realistiskt formaterad)',
    verklig: false,
    extrahera,
    berakna: (ex) => ({ c: berakna(ex), korskontroll: null }),
    narrera,
  },
  lifco: {
    kalla: p('../docs/case-sources/fall-lifco-2025.md'),
    facit: p('./fixtures/lifco-fy2025-facit.json'),
    kallText: 'docs/case-sources/fall-lifco-2025.md (verklig, anvandarverifierad kalla)',
    verklig: true,
    extrahera: extraheraLifco,
    berakna: beraknaLifco,
    narrera: narreraLifco,
  },
};

const key = process.argv[2] || 'lifco';
const A = ADAPTRAR[key];
if (!A) { console.error(`Okand kalla "${key}". Valj lifco eller norlux.`); process.exit(1); }

const text = readFileSync(A.kalla, 'utf8');

// 1. Extrahera (deterministisk adapter, inga nycklar)
const ex = A.extrahera(text);

// 2. Eval mot facit (samma grind som run.mjs)
const facit = JSON.parse(readFileSync(A.facit, 'utf8'));
let evalFel = 0, evalAntal = 0;
for (const [id, f] of Object.entries(facit.fakta)) {
  evalAntal++;
  const e = ex.fakta[id];
  if (!e || e.nu !== f.nu || (f.fjol != null && e.fjol !== f.fjol)) evalFel++;
}

// 3. Rakna i kod, 4. narrera (mallar), 5. verifiera (noll-hallucinationsgrinden)
const { c } = A.berakna(ex);
const n = A.narrera(ex, c);
const fullText = n.verdikt + '\n\n' + n.stycken.join('\n\n');
const v = verifiera(fullText, ex, c);

// Strukturerad utdata for ytan
const siffror = Object.entries(ex.fakta).map(([id, f]) => {
  const k = ex.kallor[id] || {};
  return {
    id,
    etikett: id.replace(/_/g, ' '),
    nu: f.nu,
    fjol: f.fjol != null ? f.fjol : null,
    enhet: f.enhet || '',
    forandring_pct: c[id + '_forandring_pct'] != null ? c[id + '_forandring_pct'] : null,
    citat: k.citat || '',
    kalla: k.sida != null ? `sida ${k.sida}` : (k.avsnitt || ''),
  };
});

const out = {
  bolag: ex.bolag,
  period: ex.period,
  verklig: !!A.verklig,
  kalla: A.kallText,
  genererad: new Date().toISOString().slice(0, 10),
  grind: { ok: v.ok, antal: v.resultat.length },
  eval: { ok: evalFel === 0, antal: evalAntal },
  verdikt: n.verdikt,
  stycken: n.stycken,
  siffror,
  beraknat: c,
};

mkdirSync(p('../public/labs/data'), { recursive: true });
const utfil = p(`../public/labs/data/rapport-${key}.json`);
writeFileSync(utfil, JSON.stringify(out, null, 1), 'utf8');
console.log(`Skrev ${utfil}`);
console.log(`  ${out.bolag} · ${out.period} · ${A.verklig ? 'VERKLIG DATA' : 'fiktiv'}`);
console.log(`  eval ${out.eval.ok ? 'PASS' : 'FAIL'} (${out.eval.antal}) · grind ${out.grind.ok ? 'PASS' : 'FAIL'} (${out.grind.antal} tal) · ${siffror.length} siffror`);
if (!v.ok || evalFel > 0) process.exitCode = 1;
