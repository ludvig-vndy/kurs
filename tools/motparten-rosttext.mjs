/* Plockar ut prosan ur Motpartens lektions-JSON till en markdown-fil som
   granska_rost.py kan läsa. Rubrikformatet är det skriptet delar på.
   Kör: node tools/motparten-rosttext.mjs > rost-motparten.md */

import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const DIR = join(HERE, '..', 'content', 'motparten');

function stegProsa(s) {
  const rader = [s.ingress, s.lead, s.forklaring, s.slutsats, s.takeaway,
    s.vad_som_galler, s.varifran, ...(s.brodtext ?? [])];
  for (const f of s.fragor ?? []) rader.push(f.fraga, f.forklaring);
  return rader.filter(Boolean);
}

const filer = readdirSync(DIR)
  .filter((f) => f.endsWith('.json') && f !== 'course.json' && f !== 'fardigheter.json')
  .sort();

for (const f of filer) {
  const d = JSON.parse(readFileSync(join(DIR, f), 'utf8'));
  console.log(`### ${d.lektion} ${d.titel}\n`);
  for (const s of d.steg) for (const rad of stegProsa(s)) console.log(rad + '\n');
}
