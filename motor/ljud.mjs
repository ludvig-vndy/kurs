// Ljudutgåvan v0: Ägarbrevet som uppläst tvåminuterspodd.
// Kedjan: narration (mallar) -> NOLL-HALLUCINATIONSGRINDEN (siffertexten granskas)
// -> uttalsnormalisering (deterministisk, ändrar aldrig ett värde) -> Windows-TTS.
// Intro och avslut är brevets egna ramtexter (systemdata, inte rapportpåståenden);
// grinden granskar brödtexten, precis som i produktionsflödet.
//
// Kör: node motor/ljud.mjs        -> motor/out/agarbrevet-norlux.wav + manus

import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { execFileSync } from 'child_process';
import { extrahera } from './extract.mjs';
import { berakna } from './compute.mjs';
import { narrera } from './narrate.mjs';
import { verifiera } from './verify.mjs';
import { normaliseraTal } from './tts-normalize.mjs';

const p = rel => new URL(rel, import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');

// 1. Narration ur motorn
const text = readFileSync(p('./fixtures/norlux-q3-2026.txt'), 'utf8');
const ex = extrahera(text);
const c = berakna(ex);
const n = narrera(ex, c);
const brodtext = n.verdikt + '\n\n' + n.stycken.join('\n\n');

// 2. Grinden: ingen uppläsning av ogranskad text
const v = verifiera(brodtext, ex, c);
if (!v.ok) {
  console.error(`GRINDEN STOPPAR: ${v.omatchade.length} tal saknar källa. Inget ljud genereras.`);
  process.exit(1);
}
console.log(`Grinden: PASS, ${v.resultat.length} tal spårade. Ljudet får genereras.`);

// 3. Manus: brevets ram + normaliserad brödtext
const intro = 'God morgon. Det här är Ägarbrevet, med det viktigaste om dina bolag. I dag: rapport från Norlux Industri.';
const outro = 'Det var allt för i dag. Varje siffra du hört är kontrollerad mot rapporten innan den lästes upp. Vi läser vidare. Nästa brev kommer i morgon.';
const manus = intro + '\n\n' + normaliseraTal(brodtext) + '\n\n' + outro;

mkdirSync(p('./out'), { recursive: true });
const manusFil = p('./out/agarbrevet-norlux-manus.txt');
writeFileSync(manusFil, manus, 'utf8');
console.log(`Manus: ${manusFil} (${manus.split(/\s+/).length} ord, cirka ${Math.round(manus.split(/\s+/).length / 130 * 60)} sekunder i normal lästakt)`);

// 4. Syntes med Windows inbyggda svenska röst (v0-demo; produktion: neural TTS, samma manus)
const wavFil = p('./out/agarbrevet-norlux.wav');
try {
  const ut = execFileSync('powershell', ['-NoProfile', '-ExecutionPolicy', 'Bypass',
    '-File', p('./tts-win.ps1'), '-TextFile', manusFil, '-OutFile', wavFil], { encoding: 'utf8' });
  console.log(ut.trim());
} catch (e) {
  console.error('TTS-steget misslyckades (manus finns ändå):', e.message);
  process.exitCode = 1;
}
