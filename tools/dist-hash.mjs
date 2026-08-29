/* Hashar varje HTML-fil under ett prefix i dist/ så att en refaktor kan bevisas
   vara utfallsneutral. Kör: node tools/dist-hash.mjs dist/fokus > baseline-fokus.txt */

import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

function filer(dir, ut = []) {
  for (const namn of readdirSync(dir)) {
    const p = join(dir, namn);
    if (statSync(p).isDirectory()) filer(p, ut);
    else if (p.endsWith('.html')) ut.push(p);
  }
  return ut;
}

const rot = process.argv[2];
if (!rot) {
  console.error('Ange en katalog, till exempel dist/fokus');
  process.exit(2);
}
for (const f of filer(rot).sort()) {
  const h = createHash('sha256').update(readFileSync(f)).digest('hex').slice(0, 16);
  console.log(`${h}  ${relative(rot, f).replace(/\\/g, '/')}`);
}
