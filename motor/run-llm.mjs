// Hela pipelinen med LLM i narrationsrollen: deterministisk extraktion (facit-
// bevisad), beräkning i kod, LLM skriver klarspråket, grinden granskar varje tal
// innan texten godkänns. Detta är produktionsflödets form.
//
// Kör: node motor/run-llm.mjs [--modell claude-haiku]

import { readFileSync } from 'fs';
import { extrahera } from './extract.mjs';
import { berakna } from './compute.mjs';
import { narreraLLM } from './narrate-llm.mjs';

const p = rel => new URL(rel, import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const mi = process.argv.indexOf('--modell');
const modell = mi > -1 ? process.argv[mi + 1] : 'claude-haiku';

const text = readFileSync(p('./fixtures/norlux-q3-2026.txt'), 'utf8');
const ex = extrahera(text);
const c = berakna(ex);

console.log(`Narrationsmodell: ${modell}. Skriver...`);
const r = await narreraLLM(ex, c, modell);

console.log(`\n=== LLM-NARRATION ===\n${r.text}`);
console.log(`\n=== GRINDEN ===`);
for (const t of r.verifiering.resultat)
  console.log(`  ${t.träff ? 'ok  ' : 'FAIL'} ${String(t.token).padStart(8)} ${t.träff ? '<- ' + t.träff : '<- INGEN KÄLLA, blockerande fel'}`);
console.log(r.verifiering.ok
  ? `\nPASS: alla ${r.verifiering.resultat.length} tal i LLM-texten har källa. Texten får användas. Kostnad: $${r.kostnad_usd.toFixed(4)}`
  : `\nFAIL: ${r.verifiering.omatchade.length} tal utan källa. Texten blockeras. Kostnad: $${r.kostnad_usd.toFixed(4)}`);
if (!r.verifiering.ok) process.exitCode = 1;
