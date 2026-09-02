// Motorns minne till och från Cloudflare KV.
//
// Motorn minns i två filer under motor/in/ som båda är gitignorerade: arkiv.json
// (vilka pressmeddelanden som redan är lästa, plus baslinjen för insyn och
// blankning) och bevakning-cache.json (uppslagna MFN-flöden). På din maskin
// ligger de kvar mellan körningarna. I GitHub Actions börjar varje körning på en
// tom maskin, så minnet måste hämtas före och sparas efter. KV är redan där.
//
//   node motor/state-kv.mjs hamta   KV  -> motor/in/
//   node motor/state-kv.mjs spara   motor/in/ -> KV
//
// hamta avbryter med felkod om KV inte svarar. Det är avsiktligt: kör motorn
// utan minne och den läser om gamla pressmeddelanden som nya, och brevet blir
// fel. Hellre ett uteblivet brev än ett brev som ljuger. Första gången, när
// nyckeln ännu inte finns, kör: node motor/state-kv.mjs hamta --tillat-tom

import { execFileSync } from 'child_process';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';

const p = rel => new URL(rel, import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const NS = '97d78256ff664c54a724878034c8f0fd'; // KV-namespace "upptack-data" (ludvig-kontot, bytt vid flytten 2026-08-31)
const NYCKEL = 'motor-state';
const ARKIV = p('./in/arkiv.json');
const CACHE = p('./in/bevakning-cache.json');
const KORNING = p('./in/senaste-korning.json');
const TMP = p('./out/motor-state.json');

// Pinnad major så en ny wrangler inte tystar ner ett nattjobb. --yes för CI,
// där npx annars kan stanna på installationsfrågan.
function wrangler(args, { tystFel = false } = {}) {
  return execFileSync('npx', ['--yes', 'wrangler@4', ...args], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', tystFel ? 'ignore' : 'inherit'],
    shell: process.platform === 'win32',
  });
}

function las(fil, fallback) {
  return existsSync(fil) ? JSON.parse(readFileSync(fil, 'utf8')) : fallback;
}

function hamta(tillatTom) {
  let ut;
  try {
    ut = wrangler(['kv', 'key', 'get', '--namespace-id=' + NS, NYCKEL, '--remote'], { tystFel: true });
  } catch {
    if (tillatTom) { console.log('Ingen sparad motor-state i KV. Kör vidare på det som finns lokalt.'); return; }
    console.error(`Kunde inte läsa motor-state ur KV. Avbryter hellre än kör motorn minneslös.\nFörsta gången: node motor/state-kv.mjs hamta --tillat-tom`);
    process.exit(1);
  }

  let state;
  // Wrangler skriver värdet rått till stdout, men en banner kan smita med.
  try { state = JSON.parse(ut.slice(ut.indexOf('{'))); }
  catch { console.error('motor-state i KV gick inte att tolka som JSON. Avbryter.'); process.exit(1); }

  mkdirSync(p('./in'), { recursive: true });
  writeFileSync(ARKIV, JSON.stringify(state.arkiv || {}, null, 1));
  if (state.bevakningCache) writeFileSync(CACHE, JSON.stringify(state.bevakningCache, null, 2));
  // Tidpunkten minnet senast sparades är också "förra körningen", och det är
  // gränsen natt.mjs mäter färskhet mot. Utan den vet en ren CI-maskin inte
  // vad som redan stått i gårdagens brev.
  writeFileSync(KORNING, JSON.stringify({ uppdaterad: state.uppdaterad || null }));
  const bolag = Object.keys(state.arkiv || {}).length;
  console.log(`Minnet hämtat ur KV: ${bolag} bolag i arkivet, sparat ${state.uppdaterad || 'okänt datum'}.`);
}

function spara() {
  if (!existsSync(ARKIV)) { console.error('Hittar inte motor/in/arkiv.json. Kör natt.mjs först.'); process.exit(1); }
  const state = {
    uppdaterad: new Date().toISOString(),
    arkiv: las(ARKIV, {}),
    bevakningCache: las(CACHE, {}),
  };
  mkdirSync(p('./out'), { recursive: true });
  writeFileSync(TMP, JSON.stringify(state));
  wrangler(['kv', 'key', 'put', '--namespace-id=' + NS, NYCKEL, '--path=' + TMP, '--remote']);
  console.log(`Minnet sparat till KV: ${Object.keys(state.arkiv).length} bolag i arkivet.`);
}

const kommando = process.argv[2];
if (kommando === 'hamta') hamta(process.argv.includes('--tillat-tom'));
else if (kommando === 'spara') spara();
else { console.error('Använd: node motor/state-kv.mjs hamta|spara'); process.exit(1); }
