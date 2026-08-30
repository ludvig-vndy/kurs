/* Syntaxgrind för inline-JS i public/labs/*.html.

   Sidorna där är handskrivna med skripten i sidan, inte i moduler, så ingen
   bundler tittar på dem. Ett enda trasigt regex-literal tar hela sidan tyst:
   ingenting renderas, konsolen säger "Invalid regular expression" och användaren
   ser bara en sida som inte laddar. Det hände 2026-08-30 och en pilot satt fast
   på en vit sida tills felet hittades för hand.

   Grinden parsar varje <script>-block utan att köra det. new Function kastar på
   syntaxfel men utför ingenting, vilket är precis vad vi vill: vi kontrollerar
   att koden GÅR att läsa, inte vad den gör.

   Kör: node tools/check-labs-js.mjs
*/
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const p = rel => new URL(rel, import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const DIRS = ['../public/labs', '../public'];

export function kontrolleraLabsJs() {
  const fel = [];
  let block = 0, filer = 0;
  for (const d of DIRS) {
    const dir = p(d);
    if (!existsSync(dir)) continue;
    for (const namn of readdirSync(dir).filter(f => f.endsWith('.html'))) {
      filer++;
      const text = readFileSync(`${dir}/${namn}`, 'utf8');
      // Bara block utan src: externa filer laddas som de är och parsas av andra.
      const blocken = [...text.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi)];
      for (const [i, m] of blocken.entries()) {
        const kod = m[1];
        if (!kod.trim()) continue;
        // type="module" tillåter import/export, som new Function inte klarar.
        const arModul = /type\s*=\s*["']module["']/i.test(m[0]);
        if (arModul) continue;
        block++;
        try {
          new Function(kod);
        } catch (e) {
          fel.push(`${namn} block ${i + 1}: ${e.message}`);
        }
      }
    }
  }
  return { fel, block, filer };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { fel, block, filer } = kontrolleraLabsJs();
  if (fel.length) {
    console.error(`Syntaxfel i inline-JS (${fel.length}):`);
    for (const f of fel) console.error(`  ${f}`);
    process.exit(1);
  }
  console.log(`Inline-JS: ${block} skriptblock i ${filer} filer, alla parsar.`);
}
