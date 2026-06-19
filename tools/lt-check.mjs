import { pathToFileURL } from 'node:url';
import { readFile } from 'node:fs/promises';
import { loadLessons } from './lib/lessons.mjs';

/*
 * lt-check.mjs  --  LanguageTool-grind (lager 2 i grammatiklagret)
 *
 * Kör lektionstext mot en LOKAL LanguageTool-server så inget kursmaterial
 * lämnar maskinen. Start servern först:
 *   cd .lt/LanguageTool-6.6
 *   java -cp languagetool-server.jar org.languagetool.server.HTTPServer --port 8081
 *
 * LT svenska fångar stavfel, dubblerade ord och en del kongruens. Den fångar
 * INTE syntaxfel med giltiga ord ("verka självmål") -- det tas av regex-lagret
 * (rost-flagga.mjs) och den oberoende modell-korrekturen.
 *
 * Användning:
 *   node tools/lt-check.mjs                         # alla lektioner
 *   node tools/lt-check.mjs src/.../1.1-....md      # en eller flera filer
 *   LT_URL=http://localhost:8081/v2/check node tools/lt-check.mjs ...
 */

const ENDPOINT = process.env.LT_URL || 'http://localhost:8081/v2/check';

// Domäntermer/namn som Hunspell felaktigt flaggar som stavfel. Tystas.
const ALLOW = new Set([
  'moat', 'moats', 'moaten', 'EBIT', 'EBITDA', 'NOPAT', 'ROIC', 'ROE', 'ROA',
  'WACC', 'capex', 'opex', 'FCFF', 'FCFE', 'DCF', 'churn', 'runway', 'burn',
  'Lifco', 'Graham', 'Buffett', 'P', 'E', 'EV', 'TAM', 'SaaS', 'G', 'A',
  'case', 'cases', 'caset', 'pris', 'vs',
]);

// Markdown-artefakter, inte prosafel: list-/rubrikstrippning skapar
// fragment som ger falsk "versalstart" och dubbla blanksteg. Tystas.
const NOISE_RULES = new Set(['WHITESPACE_RULE', 'UPPERCASE_SENTENCE_START']);

function clean(body) {
  return body
    .replace(/\r\n/g, '\n')                       // CRLF -> LF (annars missas frontmatter)
    .replace(/^---\n[\s\S]*?\n---\n?/, '')        // frontmatter (om kvar)
    .replace(/```[\s\S]*?```/g, '')               // kodblock
    .replace(/`[^`]*`/g, '')                      // inline-kod
    .replace(/^#{1,6}\s+/gm, '')                  // rubrikmarkörer
    .replace(/^\s*[-*]\s+(\[[ x]\]\s*)?/gm, '')   // list-/checkbox-markörer
    .replace(/\*\*([^*]+)\*\*/g, '$1')            // fetstil
    .replace(/\*([^*]+)\*/g, '$1')                // kursiv
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');     // länkar
}

async function check(text) {
  const body = new URLSearchParams({ text, language: 'sv' });
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8' },
    body,
  });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} (är LT-servern igång på ${ENDPOINT}?)`);
  return res.json();
}

function isNoise(m, frag) {
  if (NOISE_RULES.has(m.rule.id)) return true;
  if (m.rule.id === 'HUNSPELL_RULE' && ALLOW.has(frag.replace(/[.,:;]$/, ''))) return true;
  return false;
}

export async function ltCheckText(text) {
  const r = await check(clean(text));
  return r.matches;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const fileArgs = process.argv.slice(2).filter((a) => !a.startsWith('--'));

  let targets;
  if (fileArgs.length) {
    targets = [];
    for (const f of fileArgs) {
      const raw = (await readFile(f, 'utf8')).replace(/\r\n/g, '\n');
      const body = raw.replace(/^---\n[\s\S]*?\n---\n?/, '');
      targets.push({ path: f.split('\\').join('/'), body });
    }
  } else {
    targets = await loadLessons();
  }

  let total = 0;
  for (const t of targets) {
    let matches;
    try {
      matches = await ltCheckText(t.body);
    } catch (e) {
      console.error(`FEL ${t.path}: ${e.message}`);
      process.exit(2);
    }
    const cleaned = clean(t.body);
    const real = matches.filter((m) => !isNoise(m, cleaned.slice(m.offset, m.offset + m.length)));
    if (!real.length) continue;
    total += real.length;
    console.log(`\n${t.path}  (${real.length})`);
    for (const m of real) {
      const frag = cleaned.slice(m.offset, m.offset + m.length);
      const repl = m.replacements.slice(0, 3).map((x) => x.value).join(' / ') || '-';
      console.log(`  [${m.rule.issueType}] "${frag}"  ->  ${repl}   (${m.rule.id})`);
      console.log(`     ${m.message}`);
    }
  }
  console.log(`\n${total ? total + ' möjliga' : 'Inga'} LanguageTool-träffar (efter domänfilter).`);
  process.exit(0);
}
