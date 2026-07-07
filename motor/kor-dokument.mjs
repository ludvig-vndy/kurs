// Kör ett riktigt, hämtat dokument genom LLM-extraktionen med generiska
// fältlistor per dokumenttyp. Utan facit: utdata är fakta med citat för
// mänsklig granskning, alphans arbetsläge tills facit byggts per bolag.
//
// Kör: node motor/kor-dokument.mjs --typ kallelse --fil motor/in/unibap-kallelse-extra-2026.txt
//      Typer: rapport, kallelse, emission, avtal

import { readFileSync } from 'fs';
import { extraheraLLM, klassificeraAvtalLLM } from './extract-llm.mjs';
import { FALT } from './faltlistor.mjs';

// Fältlistorna delas med nattjobbet.

const args = process.argv.slice(2);
const typ = args[args.indexOf('--typ') + 1];
const fil = args[args.indexOf('--fil') + 1];
const mi = args.indexOf('--modell');
const modell = mi > -1 ? args[mi + 1] : 'claude-haiku';
if (!typ || !fil) { console.error('Användning: node motor/kor-dokument.mjs --typ <rapport|kallelse|emission|avtal> --fil <sökväg>'); process.exit(1); }

const text = readFileSync(fil, 'utf8');
console.log(`\n=== RIKTIGT DOKUMENT · ${fil.split(/[\\/]/).pop()} · typ: ${typ} · modell: ${modell} ===`);

if (typ === 'avtal') {
  const r = await klassificeraAvtalLLM([{ id: 'pm1', text }], modell);
  for (const k of r.klassningar) {
    console.log(`  klass: ${k.klass.toUpperCase()}`);
    console.log(`  bevis: "${k.bevis}"`);
  }
  console.log(`  kostnad: $${r.kostnad_usd.toFixed(4)}`);
} else {
  const r = await extraheraLLM(text, FALT[typ], modell);
  const n = Object.keys(r.fakta).length;
  console.log(`  ${n} av ${FALT[typ].length} fält funna (frånvaro = fältet står inte i dokumentet):\n`);
  for (const [id, f] of Object.entries(r.fakta)) {
    const k = r.kallor[id];
    console.log(`  ${id.padEnd(28)} ${String(f.nu).padStart(12)}${f.fjol != null ? ` (jmf ${f.fjol})` : ''} ${f.enhet}`);
    console.log(`      citat: "${(k ? k.citat : 'SAKNAS').slice(0, 110)}"`);
  }
  if (r.fel.length) { console.log(`\n  ANMÄRKNINGAR:`); r.fel.forEach(f => console.log(`   - ${f}`)); }
  console.log(`\n  kostnad: $${r.kostnad_usd.toFixed(4)} · ${r.tokens} tokens`);
}
