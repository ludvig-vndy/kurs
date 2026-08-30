/* Syntaxgrind för handskriven JS: inline-block i public/**.html, och de
   fristående .js-filerna i functions/ och public/ som ingen bundler tittar på.

   Sidorna i public/labs är skrivna med skripten i sidan, inte i moduler. Ett
   enda trasigt regex-literal tar hela sidan tyst: ingenting renderas, konsolen
   säger "Invalid regular expression" och användaren ser bara en sida som inte
   laddar. Det hände 2026-08-30 och en pilot satt fast på en vit sida tills felet
   hittades för hand.

   Pages Functions har samma egenskap i en värre form. En trasig functions/api/*
   syns inte förrän någon anropar endpointen i produktion, och den deployas utan
   att någonting protesterar. Samma fel uppstod där 2026-08-30 (en heredoc åt
   backslashen i en \n-escape och delade ett strängliteral mitt itu), vilket är
   skälet till att grinden numera täcker mer än labs.

   Metod: inline-block parsas med new Function, som kastar på syntaxfel men
   utför ingenting. Fristående filer får node --check, eftersom de är ES-moduler
   och new Function inte klarar import/export. Bägge kontrollerar att koden GÅR
   att läsa, aldrig vad den gör.

   Kör: node tools/check-labs-js.mjs
*/
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

const p = rel => new URL(rel, import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const HTML_DIRS = ['../public/labs', '../public'];
const JS_TRAD = ['../functions', '../public'];

function inlineBlock() {
  const fel = [];
  let block = 0, filer = 0;
  for (const d of HTML_DIRS) {
    const dir = p(d);
    if (!existsSync(dir)) continue;
    for (const namn of readdirSync(dir).filter(f => f.endsWith('.html'))) {
      filer++;
      const text = readFileSync(`${dir}/${namn}`, 'utf8');
      // Bara block utan src: externa filer laddas som de är och parsas nedan.
      const blocken = [...text.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi)];
      for (const [i, m] of blocken.entries()) {
        const kod = m[1];
        if (!kod.trim()) continue;
        // type="module" tillåter import/export, som new Function inte klarar.
        if (/type\s*=\s*["']module["']/i.test(m[0])) continue;
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

function jsFiler(dir, ut = []) {
  if (!existsSync(dir)) return ut;
  for (const namn of readdirSync(dir)) {
    if (namn === 'node_modules' || namn === 'vendor') continue;   // tredjepart, inte vår kod
    const full = `${dir}/${namn}`;
    if (statSync(full).isDirectory()) jsFiler(full, ut);
    else if (/\.m?js$/.test(namn)) ut.push(full);
  }
  return ut;
}

function fristaende() {
  const fel = [];
  const filer = JS_TRAD.flatMap(d => jsFiler(p(d)));
  for (const full of filer) {
    try {
      execFileSync(process.execPath, ['--check', full], { stdio: ['ignore', 'ignore', 'pipe'] });
    } catch (e) {
      // node --check skriver kodraden, en karet-rad, själva felet och sist sin
      // egen versionsrad. Det är felraden vi vill ha, inte den sista raden:
      // "api/fraga.js: Node.js v24.12.0" säger ingenting om vad som är trasigt.
      const ut = String(e.stderr || '').trim().split(/\r?\n/).filter(Boolean);
      const rad = ut.find(r => /^\s*\w*(SyntaxError|Error):/.test(r)) || ut[0] || 'syntaxfel';
      const plats = (ut[0] || '').match(/:(\d+)$/);
      fel.push(`${full.split(/[\\/]/).slice(-2).join('/')}${plats ? ':' + plats[1] : ''}: ${rad.trim()}`);
    }
  }
  return { fel, antal: filer.length };
}

export function kontrolleraLabsJs() {
  const inline = inlineBlock();
  const fri = fristaende();
  return { fel: inline.fel.concat(fri.fel), block: inline.block, filer: inline.filer, jsFiler: fri.antal };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { fel, block, filer, jsFiler: n } = kontrolleraLabsJs();
  if (fel.length) {
    console.error(`Syntaxfel i handskriven JS (${fel.length}):`);
    for (const f of fel) console.error(`  ${f}`);
    process.exit(1);
  }
  console.log(`JS: ${block} inline-block i ${filer} sidor och ${n} fristående filer, alla parsar.`);
}
