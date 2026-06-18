import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const base = 'src/content/kurs';

async function walk(d) {
  const o = [];
  for (const e of await readdir(d, { withFileTypes: true })) {
    const p = join(d, e.name);
    if (e.isDirectory()) o.push(...(await walk(p)));
    else if (/\.mdx?$/.test(e.name)) o.push(p);
  }
  return o;
}

const g = (raw, k) => {
  const m = raw.match(new RegExp('^' + k + ':\\s*(.+)$', 'm'));
  return m ? m[1].replace(/#.*$/, '').trim().replace(/^["']|["']$/g, '') : '';
};

const rows = [];
for (const f of await walk(base)) {
  const raw = await readFile(f, 'utf8');
  rows.push({
    ordning: Number(g(raw, 'ordning')),
    lektion: g(raw, 'lektion'),
    titel: g(raw, 'titel'),
    path: f.split('\\').join('/'),
  });
}
rows.sort((a, b) => a.ordning - b.ordning);

const body = rows.map((r) => `${r.lektion}\t${r.titel}\t${r.path}`).join('\n');
await writeFile(
  '_MANIFEST.txt',
  '# Verifierad filuppsattning (kalla for course.manifest.json). En rad per lektion.\n# lektion\\ttitel\\tpath\n' + body + '\n'
);
console.log('Skrev _MANIFEST.txt med', rows.length, 'lektioner');
console.log('15.1:', rows.some((r) => r.lektion === '15.1'), '| 18.4:', rows.some((r) => r.lektion === '18.4'));
