// Sätter nattbrevsjobbets secrets på GitHub ur den lokala .env, så värdena inte
// behöver kopieras för hand genom en webbläsare.
//
//   node tools/satt-nattbrev-secrets.mjs            visar vad som skulle sättas
//   node tools/satt-nattbrev-secrets.mjs --kor      sätter dem
//
// Kräver att gh är inloggat (gh auth login). Värdena går till gh via stdin,
// aldrig som kommandoradsargument: argv syns i processlistan och i historiken.
//
// Cloudflare-token heter CF_KV_TOKEN i .env, inte CLOUDFLARE_API_TOKEN. Wrangler
// läser .env av sig själv, och hette den sitt riktiga namn skulle varje lokalt
// wrangler-kommando plötsligt köra med en token som bara får röra KV. Det slog
// till direkt: en pages deploy föll på "missing permissions". Namnet översätts
// när det sätts på GitHub, där det inte krockar med något.
//
// Alla värden läses ur .env, inget frågas på en prompt. Det är medvetet: kör man
// ett interaktivt kommando härifrån får prompten EOF i stället för tangentbord,
// och gh sätter då ett TOMT värde och skriver ändå "success". Samma fälla som
// wrangler pages secret put. Alla värden ska alltså ligga i .env innan du kör.

import { execFileSync } from 'child_process';
import { readFileSync, existsSync } from 'fs';

const REPO = 'ludvig-vndy/kurs';
const GH = 'C:\\Program Files\\GitHub CLI\\gh.exe';
const p = rel => new URL(rel, import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');

// [namn i .env, namn på GitHub].
const UR_ENV = [
  ['ANTHROPIC_API_KEY', 'ANTHROPIC_API_KEY'],
  ['SUPABASE_URL', 'SUPABASE_URL'],
  ['SUPABASE_SECRET_KEY', 'SUPABASE_SECRET_KEY'],
  ['CF_KV_TOKEN', 'CLOUDFLARE_API_TOKEN'],
];
// Inte hemligt, men jobbet behöver det och det hör ihop med de andra.
const FASTA = { CLOUDFLARE_ACCOUNT_ID: 'a525ec472526e7bb5e054e8f88922c50' };

function lasEnv() {
  const fil = p('../.env');
  if (!existsSync(fil)) { console.error('Hittar ingen .env i repotroten.'); process.exit(1); }
  const ut = {};
  for (const rad of readFileSync(fil, 'utf8').split(/\r?\n/)) {
    const m = rad.match(/^\s*([A-Z0-9_]+)\s*=\s*(.+?)\s*$/);
    if (m) ut[m[1]] = m[2];
  }
  return ut;
}

const gh = existsSync(GH) ? GH : 'gh';
const kor = process.argv.includes('--kor');
const env = lasEnv();

const attSatta = [];
for (const [iEnv, paGitHub] of UR_ENV) {
  if (!env[iEnv]) {
    console.error(`${iEnv} saknas i .env.`);
    if (iEnv === 'CF_KV_TOKEN') console.error('Skapa den i Cloudflare (My Profile, API Tokens, Custom token, enda behörigheten Account - Workers KV Storage - Edit) och lägg in raden CF_KV_TOKEN=... i .env.');
    process.exit(1);
  }
  attSatta.push([paGitHub, env[iEnv]]);
}
for (const [namn, varde] of Object.entries(FASTA)) attSatta.push([namn, varde]);

if (!kor) {
  console.log(`Skulle sätta ${attSatta.length} secrets på ${REPO}:`);
  for (const [namn, varde] of attSatta) console.log(`  ${namn}  (${varde.length} tecken)`);
  console.log('\nKör med --kor för att sätta dem.');
  process.exit(0);
}

for (const [namn, varde] of attSatta) {
  if (!varde.trim()) { console.error(`${namn} är tomt. Avbryter: ett tomt secret ser ut att lyckas men gör jobbet trasigt.`); process.exit(1); }
  execFileSync(gh, ['secret', 'set', namn, '--repo', REPO], { input: varde, stdio: ['pipe', 'inherit', 'inherit'] });
  console.log(`satt: ${namn}`);
}
console.log(`\nKlart. Kontrollera med: gh secret list --repo ${REPO}`);
