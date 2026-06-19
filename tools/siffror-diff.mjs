import { pathToFileURL } from 'node:url';
import { execFileSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';

/*
 * siffror-diff.mjs  --  hård spärr för sifferpolicyn
 *
 * Jämför alla tal (siffersekvenser) i varje ändrad lektion mot en baslinje-ref
 * i git. Om multimängden tal skiljer sig har röstpasset råkat ändra ett tal,
 * och det failar. Skriver om meningen runt talet är ok; att ändra talet är inte.
 *
 * Talen normaliseras lätt: tusentalsblanksteg tas bort (15 000 -> 15000) så att
 * en omformulering som byter "15 000" mot "15000" inte falsklarmar. Decimaltecken
 * (komma/punkt) behålls som de är.
 *
 * Användning:
 *   node tools/siffror-diff.mjs [baslinje-ref]      # default: HEAD
 *   node tools/siffror-diff.mjs <sha>               # mot fast baslinje-commit
 *   node tools/siffror-diff.mjs <sha> <fil> [fil..] # bara dessa filer
 */

function git(args) {
  return execFileSync('git', args, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
}

// Plocka tal: heltal/decimaler, med ev. tusentalsblanksteg. Returnera sorterad
// multimängd som strängar (normaliserade).
function numbers(text) {
  const t = text
    .replace(/\r\n/g, '\n')
    .replace(/^---\n[\s\S]*?\n---\n?/, ''); // hoppa frontmatter (quiz-index etc.)
  const out = [];
  // matcha t.ex. 15 000, 1 950, 19,5, 1,10, 100, 2025, 27
  const re = /\d[\d\s]*(?:[.,]\d+)?/g;
  for (const m of t.match(re) || []) {
    const norm = m.replace(/\s+/g, ''); // tusentalsblanksteg bort
    if (/^\d+(?:[.,]\d+)?$/.test(norm)) out.push(norm);
  }
  return out.sort();
}

function multisetDiff(a, b) {
  const count = (arr) => arr.reduce((m, x) => m.set(x, (m.get(x) || 0) + 1), new Map());
  const ca = count(a), cb = count(b);
  const removed = [], added = [];
  for (const [k, v] of ca) { const d = v - (cb.get(k) || 0); for (let i = 0; i < d; i++) removed.push(k); }
  for (const [k, v] of cb) { const d = v - (ca.get(k) || 0); for (let i = 0; i < d; i++) added.push(k); }
  return { removed, added };
}

export async function siffrorDiff(baseRef = 'HEAD', files = null) {
  let changed = files;
  if (!changed) {
    const out = git(['diff', '--name-only', baseRef, '--', 'src/content/kurs']).trim();
    changed = out ? out.split('\n').filter((f) => /\.mdx?$/.test(f)) : [];
  }
  const problems = [];
  for (const f of changed) {
    let baseText;
    try {
      baseText = git(['show', `${baseRef}:${f}`]);
    } catch {
      continue; // ny fil utan baslinje, hoppa
    }
    const curText = await readFile(f, 'utf8');
    const { removed, added } = multisetDiff(numbers(baseText), numbers(curText));
    if (removed.length || added.length) {
      problems.push({ file: f, removed, added });
    }
  }
  return problems;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const argv = process.argv.slice(2);
  const baseRef = argv[0] || 'HEAD';
  const files = argv.slice(1).length ? argv.slice(1).map((f) => f.split('\\').join('/')) : null;

  const problems = await siffrorDiff(baseRef, files);
  if (!problems.length) {
    console.log(`✓ siffror oförändrade mot ${baseRef} (inga tal rörda i ändrade lektioner)`);
    process.exit(0);
  }
  console.error(`✗ SIFFROR ÄNDRADE mot ${baseRef}:`);
  for (const p of problems) {
    console.error(`  ${p.file}`);
    if (p.removed.length) console.error(`     borttagna: ${p.removed.join(', ')}`);
    if (p.added.length) console.error(`     tillagda:  ${p.added.join(', ')}`);
  }
  console.error(`\n${problems.length} lektion(er) med ändrade tal. Återställ talen.`);
  process.exit(1);
}
