// Kör hela pipelinen: extrahera → jämför mot facit → räkna (+ korskontroll) →
// narrera → verifiera. Tre källor:
//   node motor/run.mjs              Norlux-kvartalsrapporten (fiktiv)
//   node motor/run.mjs --lifco      Lifco-fallkällan (verklig, användarverifierad data)
//   node motor/run.mjs --kallelse   Voltcell-stämmokallelsen (fiktiv) = utspädningsvakten v0.2
// Flaggan --sabotage injicerar en påhittad siffra och bevisar att grinden fångar den.

import { readFileSync } from 'fs';
import { extrahera } from './extract.mjs';
import { berakna } from './compute.mjs';
import { narrera } from './narrate.mjs';
import { extraheraLifco } from './extract-lifco.mjs';
import { beraknaLifco } from './compute-lifco.mjs';
import { narreraLifco } from './narrate-lifco.mjs';
import { extraheraKallelse } from './extract-kallelse.mjs';
import { beraknaKallelse } from './compute-kallelse.mjs';
import { narreraKallelse } from './narrate-kallelse.mjs';
import { extraheraAvtal, KLASSER } from './extract-avtal.mjs';
import { beraknaAvtal } from './compute-avtal.mjs';
import { narreraAvtal } from './narrate-avtal.mjs';
import { verifiera } from './verify.mjs';

const p = rel => new URL(rel, import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');

const ADAPTRAR = {
  norlux: {
    kalla: p('./fixtures/norlux-q3-2026.txt'), facit: p('./fixtures/norlux-facit.json'),
    etikett: '', extrahera, berakna: ex => ({ c: berakna(ex), korskontroll: null }), narrera
  },
  lifco: {
    kalla: p('../docs/case-sources/fall-lifco-2025.md'), facit: p('./fixtures/lifco-fy2025-facit.json'),
    etikett: ' · VERKLIG DATA (användarverifierad källa)', extrahera: extraheraLifco, berakna: beraknaLifco, narrera: narreraLifco
  },
  kallelse: {
    kalla: p('./fixtures/voltcell-kallelse-2026.txt'), facit: p('./fixtures/voltcell-kallelse-facit.json'),
    etikett: ' · UTSPÄDNINGSVAKTEN', extrahera: extraheraKallelse, berakna: beraknaKallelse, narrera: narreraKallelse
  },
  avtal: {
    kalla: p('./fixtures/voltcell-pm-2026.txt'), facit: p('./fixtures/voltcell-pm-facit.json'),
    etikett: ' · AVTALSKLASSIFICERAREN', extrahera: extraheraAvtal, berakna: beraknaAvtal, narrera: narreraAvtal
  }
};

const sabotage = process.argv.includes('--sabotage');
const val = process.argv.includes('--lifco') ? 'lifco' : process.argv.includes('--kallelse') ? 'kallelse' : process.argv.includes('--avtal') ? 'avtal' : 'norlux';
const A = ADAPTRAR[val];
const text = readFileSync(A.kalla, 'utf8');

// 1. Extrahera
const ex = A.extrahera(text);
console.log(`\n=== EXTRAKTION · ${ex.bolag} · ${ex.period}${A.etikett} ===`);
for (const [id, f] of Object.entries(ex.fakta)) {
  const k = ex.kallor[id];
  const fjol = f.fjol != null ? `(fjol ${f.fjol})` : '';
  const kstr = k.sida != null ? `sida ${k.sida}` : k.avsnitt;
  console.log(`  ${id.padEnd(28)} ${String(f.nu).padStart(9)} ${fjol.padEnd(12)} ${(f.enhet || '').padEnd(4)} <- ${kstr}: "${k.citat.slice(0, 44)}..."`);
}
if (ex.flaggor) for (const [id, v] of Object.entries(ex.flaggor))
  console.log(`  flagga: ${id} = ${v} <- sida ${ex.kallor[id].sida}: "${ex.kallor[id].citat.slice(0, 60)}..."`);
if (ex.guidning) console.log(`  guidning: ${ex.guidning.gammal_lag}-${ex.guidning.gammal_hog} -> ${ex.guidning.ny_lag}-${ex.guidning.ny_hog} (sida ${ex.kallor.guidning.sida})`);
if (ex.pm) {
  console.log(`\n  KLASSIFICERING (regelbaserad, med bevis ur avtalstexten):`);
  for (const post of ex.pm) {
    console.log(`  ${post.id}  ${post.datum ? post.datum.ar : '?'} · ${post.klass.toUpperCase().padEnd(18)} "${(post.rubrik || '').slice(0, 56)}"`);
    if (post.bevis) console.log(`        bevis: "${post.bevis.slice(0, 92)}"`);
    if (!KLASSER.includes(post.klass)) { console.log(`        SCHEMAFEL: '${post.klass}' är ingen tillåten klass`); process.exitCode = 1; }
  }
}

// 2. Eval mot facit
const facit = JSON.parse(readFileSync(A.facit, 'utf8'));
let fel = 0, antal = 0;
for (const [id, f] of Object.entries(facit.fakta)) {
  antal++;
  const e = ex.fakta[id];
  if (!e || e.nu !== f.nu || (f.fjol != null && e.fjol !== f.fjol)) {
    console.log(`  EVAL-FEL: ${id} (fick ${e ? e.nu + '/' + e.fjol : 'inget'})`); fel++;
  }
}
if (facit.guidning) for (const k of ['ny_lag', 'ny_hog', 'gammal_lag', 'gammal_hog']) {
  antal++;
  if (!ex.guidning || ex.guidning[k] !== facit.guidning[k]) { console.log(`  EVAL-FEL: guidning.${k}`); fel++; }
}
if (facit.klasser) for (const [id, k] of Object.entries(facit.klasser)) {
  antal++;
  const post = ex.pm && ex.pm.find(q => q.id === id);
  if (!post || post.klass !== k) { console.log(`  EVAL-FEL: ${id} klass (fick ${post ? post.klass : 'inget'}, väntade ${k})`); fel++; }
}
console.log(`\n=== EVAL MOT FACIT === ${fel === 0 ? 'PASS: alla ' + antal + ' varden korrekt extraherade' : 'FAIL: ' + fel + ' fel'}`);
if (fel > 0) process.exitCode = 1;

// 3. Räkna (+ korskontroll: källans egna uppgifter mot vad nivåerna ger)
const { c, korskontroll } = A.berakna(ex);
console.log(`\n=== BERÄKNAT (i kod, aldrig av modellen) ===`);
console.log(' ', JSON.stringify(c));
if (korskontroll) {
  console.log(`\n=== KORSKONTROLL: källans egna uppgifter mot rapporterade nivåer ===`);
  for (const k of korskontroll)
    console.log(`  ${k.ok ? 'ok  ' : 'FAIL'} ${k.namn.padEnd(48)} beräknat ${String(k.beraknad).replace('.', ',')} · källan säger ${String(k.rapporterad).replace('.', ',')}`);
  const kfel = korskontroll.filter(k => !k.ok).length;
  console.log(kfel === 0
    ? `  PASS: källans egen matematik stämmer med nivåerna, ${korskontroll.length} av ${korskontroll.length} kontroller.`
    : `  FAIL: ${kfel} avvikelser mellan källans uppgifter och nivåerna.`);
  if (kfel > 0) process.exitCode = 1;
}

// 4. Narrera
const n = A.narrera(ex, c);
let fullText = n.verdikt + '\n\n' + n.stycken.join('\n\n');
if (sabotage) {
  fullText += '\n\nOrderingången steg dessutom 23% i kvartalet.'; // påhittad siffra, finns inte i källan
  console.log('\n[SABOTAGE: en påhittad siffra (23%) injicerad i narrationen]');
}
console.log(`\n=== NARRATION ===\n${fullText}`);

// 5. Verifiera: varje tal i texten måste ha en källa
const v = verifiera(fullText, ex, c);
console.log(`\n=== VERIFIERING (noll-hallucinationsgrinden) ===`);
for (const r of v.resultat) {
  console.log(`  ${r.träff ? 'ok  ' : 'FAIL'} ${String(r.token).padStart(11)} ${r.träff ? '<- ' + r.träff : '<- INGEN KÄLLA, blockerande fel'}`);
}
console.log(v.ok
  ? `\nPASS: alla ${v.resultat.length} tal i narrationen har en källa i extraherad data eller beräkning.`
  : `\nFAIL: ${v.omatchade.length} tal saknar källa. Texten får inte visas för användaren.`);
if (!v.ok) process.exitCode = 1;
