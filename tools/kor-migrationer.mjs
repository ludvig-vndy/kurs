// Kör migrationer mot Supabase via Management-API:et.
//
//   node tools/kor-migrationer.mjs                 kör allt i katalogen
//   node tools/kor-migrationer.mjs <fil> [<fil>]   kör namngivna filer
//   node tools/kor-migrationer.mjs --lista         visar bara vad som finns
//
// Kräver SUPABASE_ACCESS_TOKEN i .env eller i miljön, eller en inloggad
// supabase-CLI. Servicenyckeln duger INTE: den går genom PostgREST och kan
// inte köra DDL.
//
// Varför ett eget skript i stället för `supabase db push`: push kräver att
// projektet är länkat och att databaslösenordet finns till hands, och den vill
// dessutom äga hela migrationshistoriken. Här kör vi ren SQL mot ett känt
// projekt, vilket är det enda vi behöver.
//
// Migrationerna i det här repot är skrivna idempotent (add column if not
// exists), så en omkörning är ofarlig.

import { readFileSync, existsSync, readdirSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';
import { pathToFileURL } from 'url';

const p = rel => new URL(rel, import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const KATALOG = p('../supabase/migrations');

// Projektet sajten kör mot, samma ref som SUPABASE_URL i klienten.
export const PROJEKT = 'xpxghvxrckpzbbkjmtcw';

/* Fyller process.env ur repo-.env för nycklar som saknas, samma mönster som
   motor/bevakningslista.mjs. .env är gitignorerad, och det är där hemligheter
   hör hemma: en token på kommandoraden hamnar både i skalhistoriken och i
   processlistan. */
function laddaEnv() {
  try {
    const rader = readFileSync(p('../.env'), 'utf8').split('\n');
    for (const rad of rader) {
      const m = rad.replace('\r', '').match(/^\s*([A-Z0-9_]+)\s*=\s*(.+?)\s*$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
    }
  } catch { /* ingen .env, förlita på miljön */ }
}

export function hittaToken() {
  laddaEnv();
  if (process.env.SUPABASE_ACCESS_TOKEN) return process.env.SUPABASE_ACCESS_TOKEN.trim();
  for (const fil of [
    join(homedir(), '.supabase', 'access-token'),
    join(homedir(), 'AppData', 'Roaming', 'supabase', 'access-token'),
  ]) {
    try { if (existsSync(fil)) return readFileSync(fil, 'utf8').trim(); } catch { /* nästa */ }
  }
  return null;
}

export function migrationer(namn = []) {
  const alla = readdirSync(KATALOG).filter(f => f.endsWith('.sql')).sort();
  if (!namn.length) return alla;
  return namn.map(n => {
    const träff = alla.find(f => f === n || f.includes(n));
    if (!träff) throw new Error('Hittar ingen migration som matchar ' + n);
    return träff;
  });
}

async function kor(sql, token) {
  const r = await fetch(`https://api.supabase.com/v1/projects/${PROJEKT}/database/query`, {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: sql }),
  });
  const text = await r.text();
  if (!r.ok) throw new Error('HTTP ' + r.status + ': ' + text.slice(0, 300));
  return text;
}

async function main() {
  const argv = process.argv.slice(2);
  const filer = migrationer(argv.filter(a => !a.startsWith('--')));

  if (argv.includes('--lista')) {
    console.log('Migrationer i ' + KATALOG + ':');
    for (const f of filer) console.log('  ' + f);
    return;
  }

  const token = hittaToken();
  if (!token) {
    console.error([
      'Ingen access-token.',
      'Skapa en på https://supabase.com/dashboard/account/tokens',
      'och lägg den sist i .env (gitignorerad) som:',
      '  SUPABASE_ACCESS_TOKEN=sbp_...',
    ].join('\n'));
    process.exit(1);
  }

  for (const f of filer) {
    const sql = readFileSync(join(KATALOG, f), 'utf8');
    process.stdout.write(f.padEnd(46));
    try {
      await kor(sql, token);
      console.log('OK');
    } catch (e) {
      console.log('FEL');
      console.error('  ' + e.message);
      process.exit(1);
    }
  }
  console.log('\n' + filer.length + (filer.length === 1 ? ' migration' : ' migrationer') + ' körda mot ' + PROJEKT + '.');
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
