// Publicerar nattens brev till Cloudflare KV, ETT PER ANVANDARE, sa
// Ägarbrevet-sidan (/api/brev) visar rätt persons brev. Körs efter natt.mjs, på
// maskinen som har wrangler inloggat. Ingen ombyggnad av sajten behövs.
//
//   node motor/publicera-brev.mjs
//
// Nycklar: brev:<user_id>. Den gamla gemensamma nyckeln brev-latest innehöll
// unionen av allas innehav och raderas därför här: den låg kvar i KV efter att
// koden slutat skriva den, och en gammal nyckel med andras portföljer i är
// precis lika läckande som en ny.

import { execFileSync } from 'child_process';
import { existsSync, readdirSync } from 'fs';

const p = rel => new URL(rel, import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const NS = '97d78256ff664c54a724878034c8f0fd'; // KV-namespace "upptack-data" (ludvig-kontot, bytt vid flytten 2026-08-31)
const GAMMAL_NYCKEL = 'brev-latest';

function wrangler(args, { tystFel = false } = {}) {
  // Pinnad major, och --yes för CI där npx annars kan stanna på installationsfrågan.
  return execFileSync('npx', ['--yes', 'wrangler@4', ...args], {
    stdio: tystFel ? ['ignore', 'pipe', 'ignore'] : 'inherit',
    shell: process.platform === 'win32',
  });
}

const utDir = p('./out');
if (!existsSync(utDir)) {
  console.error('Hittar ingen motor/out. Kör natt.mjs först.');
  process.exit(1);
}

// brev-<uuid>.json, inte brev-2026-08-30.html och inte den gamla brev-latest.json.
const filer = readdirSync(utDir).filter(f => /^brev-[0-9a-f-]{36}\.json$/i.test(f));
if (!filer.length) {
  console.error('Hittar inga personliga brev (out/brev-<user_id>.json). Kör natt.mjs först.');
  process.exit(1);
}

for (const fil of filer) {
  const uid = fil.replace(/^brev-/, '').replace(/\.json$/, '');
  wrangler(['kv', 'key', 'put', '--namespace-id=' + NS, `brev:${uid}`, '--path=' + `${utDir}/${fil}`, '--remote']);
  console.log(`Publicerat brev för ${uid.slice(0, 8)}.`);
}

// Städa bort den gemensamma nyckeln. Misslyckas det (den finns inte längre) är
// det inget fel, men det ska synas att vi försökte.
try {
  wrangler(['kv', 'key', 'delete', '--namespace-id=' + NS, GAMMAL_NYCKEL, '--remote'], { tystFel: true });
  console.log(`Raderade den gamla gemensamma nyckeln ${GAMMAL_NYCKEL}.`);
} catch {
  console.log(`${GAMMAL_NYCKEL} fanns inte att radera.`);
}

console.log(`${filer.length} brev publicerade till KV.`);
