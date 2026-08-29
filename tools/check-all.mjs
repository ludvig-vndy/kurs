import { readFile } from 'node:fs/promises';
import { checkIntegrity } from './check-integrity.mjs';
import { checkRefs } from './check-refs.mjs';
import { checkStructure } from './check-structure.mjs';
import { loadLessons } from './lib/lessons.mjs';
import { findDuplicateSentences } from './check-dedup.mjs';
import { checkFokus } from './check-fokus.mjs';
import { checkMotparten } from './check-motparten.mjs';

const base = process.argv[2] || 'src/content/kurs';

let manifest = null;
try {
  manifest = JSON.parse(await readFile('course.manifest.json', 'utf8')).lessons.map((x) => x.lektion);
} catch {
  /* körs kanske mot en delmängd (en modul) — hoppa manifest-korskoll */
}

const integrity = await checkIntegrity(base, manifest);
const refs = await checkRefs(base);
const structure = await checkStructure(base);
const dups = findDuplicateSentences(await loadLessons(base)).map(
  (d) => `×${d.count}: ${d.sentence.slice(0, 60)}…`
);

const fokus = checkFokus();
const motparten = checkMotparten();

const groups = { integritet: integrity, referenser: refs, struktur: structure, dedup: dups, fokus, motparten };
let failed = 0;
for (const [name, errs] of Object.entries(groups)) {
  console.log(`\n${errs.length ? '✗' : '✓'} ${name} (${errs.length})`);
  errs.slice(0, 20).forEach((e) => console.log('   ', e));
  if (errs.length > 20) console.log(`    … +${errs.length - 20} till`);
  failed += errs.length;
}
console.log(failed ? `\n${failed} avvik totalt` : '\nAllt grönt');
process.exit(failed ? 1 : 0);
