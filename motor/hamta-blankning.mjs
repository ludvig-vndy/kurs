// FI:s blankningsregister: öppen data som ODS (zip med XML). Hämtas, packas upp
// med systemets egna verktyg (inga npm-beroenden) och parsas till rader {emittent, procent,
// datum}. Aggregatfilen innehåller nettopositioner >= 0,5 procent per emittent.
// Diffen mot förra körningen är "avvikelsen": blankning som byggs upp eller tas
// ned är ofta första signalen, och det är fas 3-funktionen veckans avvikelser i
// sin första form.

import { writeFileSync, readFileSync, mkdirSync, existsSync, copyFileSync } from 'fs';
import { execFileSync } from 'child_process';

const p = rel => new URL(rel, import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const URL_AKTUELL = 'https://www.fi.se/sv/vara-register/blankningsregistret/GetBlankningsregisterAggregat/'; // aggregat per emittent

// Uppackning utan npm-beroende. Windows har Expand-Archive, Linux har unzip
// (finns på GitHubs ubuntu-körare). Nattjobbet kör numera båda miljöerna, och
// utan det här föll blankningen tyst bort i molnet.
function packaUpp(zip, till) {
  if (process.platform === 'win32') {
    execFileSync('powershell', ['-NoProfile', '-Command',
      `Expand-Archive -Path "${zip}" -DestinationPath "${till}" -Force`], { encoding: 'utf8' });
  } else {
    execFileSync('unzip', ['-o', '-q', zip, '-d', till], { encoding: 'utf8' });
  }
}

export async function hamtaBlankning() {
  const dir = p('./in/blankning');
  mkdirSync(dir, { recursive: true });
  const res = await fetch(URL_AKTUELL, { headers: { 'user-agent': 'Mozilla/5.0 (agarkollen-alpha)' } });
  if (!res.ok) throw new Error(`FI blankning: HTTP ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  const ods = `${dir}/aktuell.ods`, zip = `${dir}/aktuell.zip`;
  writeFileSync(ods, buf);
  copyFileSync(ods, zip);
  packaUpp(zip, `${dir}/aktuell`);
  const xml = readFileSync(`${dir}/aktuell/content.xml`, 'utf8');

  // Radparsning: varje tabellrad -> celltexter. ODS upprepar celler med
  // number-columns-repeated; för vårt bruk räcker de tre första fyllda cellerna.
  const rader = [];
  const radRe = /<table:table-row[^>]*>([\s\S]*?)<\/table:table-row>/g;
  let m;
  while ((m = radRe.exec(xml)) !== null) {
    // Tokensplitta på cellstart: hanterar både självstängande och fyllda celler.
    const celler = m[1].split('<table:table-cell').slice(1).map(seg => {
      const attr = seg.slice(0, seg.indexOf('>'));
      const varde = attr.match(/office:value="([^"]+)"/);
      const txt = seg.match(/<text:p[^>]*>([\s\S]*?)<\/text:p>/);
      return { varde: varde ? parseFloat(varde[1]) : null, text: txt ? txt[1].replace(/<[^>]+>/g, '').trim() : '' };
    });
    const fyllda = celler.filter(c => c.text || c.varde != null);
    if (fyllda.length < 3) continue;
    const procCell = fyllda.find(c => c.varde != null) || fyllda[2];
    const procent = procCell.varde != null ? procCell.varde
      : parseFloat(String(procCell.text).replace(/[%\s]/g, '').replace(',', '.'));
    if (!isFinite(procent) || procent > 100) continue;
    const emittent = fyllda[0].text;
    if (!emittent || /emittent|aktuella positioner|namn/i.test(emittent)) continue;
    rader.push({ emittent, isin: (fyllda[1] || {}).text || '', procent, datum: (fyllda[3] || {}).text || '' });
  }
  return { hamtad: new Date().toISOString().slice(0, 10), kalla: URL_AKTUELL, rader };
}

// CLI: node motor/hamta-blankning.mjs [söksträng]
if (process.argv[1] && process.argv[1].includes('hamta-blankning')) {
  const r = await hamtaBlankning();
  console.log(`${r.rader.length} aggregerade positioner (>= 0,5%).`);
  const sok = (process.argv[2] || '').toLowerCase();
  const visa = sok ? r.rader.filter(x => x.emittent.toLowerCase().includes(sok)) : r.rader.slice(0, 8);
  for (const x of visa) console.log(`  ${x.emittent.padEnd(40)} ${String(x.procent).replace('.', ',')}% · ${x.datum}`);
}
