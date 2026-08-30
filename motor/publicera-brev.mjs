// Publicerar senaste dagsbrevet (motor/out/brev-latest.json) till Cloudflare KV,
// så Ägarbrevet-sidan (/api/brev) visar det. Körs efter natt.mjs, på maskinen som
// har wrangler inloggat. Ingen ombyggnad av sajten behövs.
//
//   node motor/publicera-brev.mjs
import { execFileSync } from 'child_process';
import { existsSync } from 'fs';

const p = rel => new URL(rel, import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const NS = 'f155742e0cb14bb390fced9aea5ca641'; // KV-namespace "upptack-data" (delas)
const fil = p('./out/brev-latest.json');

if (!existsSync(fil)) {
  console.error('Hittar inte brev-latest.json. Kör natt.mjs först.');
  process.exit(1);
}

try {
  // Pinnad major, och --yes för CI där npx annars kan stanna på installationsfrågan.
  execFileSync('npx', ['--yes', 'wrangler@4', 'kv', 'key', 'put', '--namespace-id=' + NS, 'brev-latest', '--path=' + fil, '--remote'],
    { stdio: 'inherit', shell: process.platform === 'win32' });
  console.log('Dagsbrevet publicerat till KV (brev-latest).');
} catch (e) {
  console.error('Publicering misslyckades:', e.message);
  process.exit(1);
}
