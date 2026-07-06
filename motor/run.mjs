// Kör hela pipelinen: extrahera → jämför mot facit → räkna → narrera → verifiera.
// Flaggan --sabotage injicerar en påhittad siffra och bevisar att grinden fångar den.

import { readFileSync } from 'fs';
import { extrahera } from './extract.mjs';
import { berakna } from './compute.mjs';
import { narrera } from './narrate.mjs';
import { verifiera } from './verify.mjs';

const sabotage = process.argv.includes('--sabotage');
const rapportfil = process.argv[2] && !process.argv[2].startsWith('--')
  ? process.argv[2]
  : new URL('./fixtures/norlux-q3-2026.txt', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');

const text = readFileSync(rapportfil, 'utf8');

// 1. Extrahera
const ex = extrahera(text);
console.log(`\n=== EXTRAKTION · ${ex.bolag} · ${ex.period} ===`);
for (const [id, f] of Object.entries(ex.fakta)) {
  const k = ex.kallor[id];
  console.log(`  ${id.padEnd(20)} ${String(f.nu).padStart(8)} (fjol ${f.fjol}) ${f.enhet.padEnd(4)} <- sida ${k.sida}: "${k.citat.slice(0, 50)}..."`);
}
if (ex.guidning) console.log(`  guidning: ${ex.guidning.gammal_lag}-${ex.guidning.gammal_hog} -> ${ex.guidning.ny_lag}-${ex.guidning.ny_hog} (sida ${ex.kallor.guidning.sida})`);

// 2. Eval mot facit (om facit finns för denna fixtur)
try {
  const facitUrl = new URL('./fixtures/norlux-facit.json', import.meta.url);
  const facit = JSON.parse(readFileSync(facitUrl, 'utf8'));
  let fel = 0;
  for (const [id, f] of Object.entries(facit.fakta)) {
    const e = ex.fakta[id];
    if (!e || e.nu !== f.nu || e.fjol !== f.fjol) { console.log(`  EVAL-FEL: ${id}`); fel++; }
  }
  for (const k of ['ny_lag', 'ny_hog', 'gammal_lag', 'gammal_hog']) {
    if (!ex.guidning || ex.guidning[k] !== facit.guidning[k]) { console.log(`  EVAL-FEL: guidning.${k}`); fel++; }
  }
  console.log(`\n=== EVAL MOT FACIT === ${fel === 0 ? 'PASS: alla ' + (Object.keys(facit.fakta).length + 4) + ' varden korrekt extraherade' : 'FAIL: ' + fel + ' fel'}`);
  if (fel > 0) process.exitCode = 1;
} catch { /* ingen facit för denna fixtur */ }

// 3. Räkna
const c = berakna(ex);
console.log(`\n=== BERÄKNAT (i kod, aldrig av modellen) ===`);
console.log(' ', JSON.stringify(c));

// 4. Narrera
const n = narrera(ex, c);
let fullText = n.verdikt + '\n\n' + n.stycken.join('\n\n');
if (sabotage) {
  fullText += '\n\nOrderingången steg dessutom 23% i kvartalet.'; // påhittad siffra, finns inte i rapporten
  console.log('\n[SABOTAGE: en påhittad siffra (23%) injicerad i narrationen]');
}
console.log(`\n=== NARRATION ===\n${fullText}`);

// 5. Verifiera: varje tal i texten måste ha en källa
const v = verifiera(fullText, ex, c);
console.log(`\n=== VERIFIERING (noll-hallucinationsgrinden) ===`);
for (const r of v.resultat) {
  console.log(`  ${r.träff ? 'ok  ' : 'FAIL'} ${String(r.token).padStart(8)} ${r.träff ? '<- ' + r.träff : '<- INGEN KÄLLA, blockerande fel'}`);
}
console.log(v.ok
  ? `\nPASS: alla ${v.resultat.length} tal i narrationen har en källa i extraherad data eller beräkning.`
  : `\nFAIL: ${v.omatchade.length} tal saknar källa. Texten får inte visas för användaren.`);
if (!v.ok) process.exitCode = 1;
