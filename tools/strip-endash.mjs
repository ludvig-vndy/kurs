// Ersätter en-dash (–, U+2013) med bindestreck (-) i lektionsmaterialet.
// Alla förekomster är numeriska intervall (4–5 %, Modul 4–6, 15.3–15.4).
// Rör INTE matematiskt minus (−, U+2212). Kör: node tools/strip-endash.mjs
import { readFile, writeFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';

const EN = '–'; // U+2013

async function walk(dir) {
  const out = [];
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) out.push(...(await walk(p)));
    else if (/\.(md|mdx)$/.test(e.name)) out.push(p);
  }
  return out;
}

let files = 0, count = 0;
for (const path of await walk('src/content/kurs')) {
  const raw = await readFile(path, 'utf8');
  if (!raw.includes(EN)) continue;
  const n = (raw.match(new RegExp(EN, 'g')) || []).length;
  await writeFile(path, raw.split(EN).join('-'));
  files++; count += n;
}
console.log(`Bytte ${count} en-dashar i ${files} filer mot bindestreck.`);
