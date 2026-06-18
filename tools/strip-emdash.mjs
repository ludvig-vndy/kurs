// Tar bort em-dash (—, U+2014) i lektionsmaterialet och ersätter med komma.
// Säker: rör BARA horisontella blanksteg runt em-dashen, aldrig radbrytningar
// eller indentering. Kör: node tools/strip-emdash.mjs
import { readFile, writeFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';

const EM = '—';

async function walk(dir) {
  const out = [];
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) out.push(...(await walk(p)));
    else if (/\.(md|mdx)$/.test(e.name)) out.push(p);
  }
  return out;
}

const targets = await walk('src/content/kurs');

let totalFiles = 0;
let totalDashes = 0;
for (const path of targets) {
  const raw = await readFile(path, 'utf8');
  if (!raw.includes(EM)) continue;
  const before = (raw.match(new RegExp(EM, 'g')) || []).length;
  let next = raw
    // em-dash med ev. omgivande HORISONTELLA blanksteg → komma + ett blanksteg
    .replace(/[ \t]*—[ \t]*/g, ', ')
    // städa ev. dubbelt skiljetecken (endast horisontellt, aldrig radbrytning)
    .replace(/,[ \t]*,/g, ',')
    .replace(/,[ \t]*\./g, '.');
  await writeFile(path, next);
  totalFiles++;
  totalDashes += before;
}
console.log(`Bytte ${totalDashes} em-dashar i ${totalFiles} filer mot komma.`);
