// Bolagslistan för söket i "Lägg till bolag": hämtar noterade nordiska bolag
// (namn + ticker + marknad) från stockanalysis.com och skriver en bundlad
// public/labs/data/companies.json som sidan söker klientsida.
//
// Källa: stockanalysis list-sidor (SvelteKit __data.json). Taket är hårt: 500 per
// marknad efter börsvärde, och de har ingen First North-lista (kontrollerat
// 2026-08-30, sex slugg-varianter och Nasdaqs eget API, alla tomma).
//
// Antagandet att 500 "täcker varje bolag en småsparare äger" föll samma dag: en
// pilot la in Ferroamp, som ligger på First North och alltså inte finns här.
// Svansen sköts nu i stället av /api/bolagssok (Yahoo), som söker live och ger
// ticker i den form /api/kurshistorik vill ha. Den här filen är kvar som snabb
// offline-lista med kurssnapshot för de stora, inte som hela universumet.
//
// Kör: node motor/hamta-bolag.mjs   (uppdatera regelbundet, t.ex. i nattjobbet)

import { writeFileSync, mkdirSync } from 'fs';
import { fileURLToPath, pathToFileURL } from 'url';

const EXCH = [
  ['nasdaq-stockholm', 'Stockholm', 'SE'],
  ['oslo-bors', 'Oslo', 'NO'],
  ['copenhagen-stock-exchange', 'Köpenhamn', 'DK'],
  ['nasdaq-helsinki', 'Helsingfors', 'FI'],
  ['nasdaq-iceland', 'Reykjavik', 'IS'],
];

// SvelteKit devalue-format: en platt array där tal är index in i samma array.
function unflatten(arr) {
  const seen = new Array(arr.length), done = new Array(arr.length).fill(false);
  function hyd(i) {
    if (i === -1) return undefined;
    if (i === -2) return NaN;
    if (typeof i !== 'number') return i;
    if (done[i]) return seen[i];
    const v = arr[i];
    if (v === null || typeof v !== 'object') { done[i] = true; seen[i] = v; return v; }
    if (Array.isArray(v)) { const r = []; seen[i] = r; done[i] = true; for (const j of v) r.push(hyd(j)); return r; }
    const r = {}; seen[i] = r; done[i] = true; for (const k in v) r[k] = hyd(v[k]); return r;
  }
  return hyd(0);
}

// Hitta arrayen med bolagsobjekt (varje har s = symbol och n = namn).
function findRows(raw) {
  for (const node of raw.nodes || []) {
    if (!node || node.type !== 'data' || !Array.isArray(node.data)) continue;
    let obj; try { obj = unflatten(node.data); } catch (e) { continue; }
    const stack = [obj], seen = new Set();
    while (stack.length) {
      const cur = stack.pop();
      if (!cur || typeof cur !== 'object' || seen.has(cur)) continue;
      seen.add(cur);
      if (Array.isArray(cur)) {
        if (cur.length > 20 && cur.every(x => x && typeof x === 'object' && 's' in x && 'n' in x)) return cur;
        cur.forEach(x => stack.push(x));
      } else for (const k in cur) stack.push(cur[k]);
    }
  }
  return [];
}

export async function hamtaBolag() {
  const all = [], seen = new Set();
  for (const [slug, market, cc] of EXCH) {
    const r = await fetch(`https://stockanalysis.com/list/${slug}/__data.json`, { headers: { 'user-agent': 'Mozilla/5.0' } });
    if (!r.ok) { console.warn(`${market}: HTTP ${r.status}, hoppar över`); continue; }
    const rows = findRows(await r.json());
    let n = 0;
    for (const row of rows) {
      if (row.subtype && row.subtype !== 'stock') continue;
      const ticker = String(row.s || '').split('/').pop();
      const name = String(row.n || '').trim();
      if (!name || !ticker) continue;
      const key = cc + ':' + ticker;
      if (seen.has(key)) continue;
      seen.add(key);
      // BARA IDENTITET. Filen bar tidigare senaste kurs (p) och dagens
      // forandring (ch), men den ar en committad statisk fil som ingen kor om:
      // den 7 september 2026 visade den fortfarande kurser fran den 29 augusti.
      // Kurserna hamtas numera live ur /api/kurshistorik av bade Dina bolag och
      // innehavssidan, sa talen har fyllde ingen funktion utom att kunna bli
      // gamla utan att nagon markte det. Lagg inte tillbaka dem.
      all.push({ n: name, t: ticker, m: market, c: cc });
      n++;
    }
    console.log(`${market.padEnd(12)} ${slug.padEnd(26)} ${n} bolag`);
  }
  all.sort((a, b) => a.n.localeCompare(b.n, 'sv'));
  return all;
}

async function main() {
  const all = await hamtaBolag();
  const outDir = fileURLToPath(new URL('../public/labs/data/', import.meta.url));
  mkdirSync(outDir, { recursive: true });
  // Ingen `uppdaterad`-stampel: filen bar inga kurser langre, bara identitet
  // (namn, ticker, marknad, land), och den aldras inte. Ett datum har skulle
  // bara inbjuda nasta sida att visa "kurs per <datum>" om ett tal som inte
  // finns i filen.
  const payload = { bolag: all };
  const out = outDir + 'companies.json';
  const json = JSON.stringify(payload);
  writeFileSync(out, json, 'utf8');
  console.log(`TOTALT ${all.length} bolag, skrev ${out} (${(json.length / 1024) | 0} kB)`);
}

// Windows-säker huvudmodulkoll.
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
