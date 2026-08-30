// Fyller i ticker på innehav som saknar en.
//
// Bolag som lades till innan söket täckte First North fick sitt namn inskrivet
// för hand och ingen ticker, och utan ticker finns ingen kurs och ingen historik.
// Det här slår upp namnet mot samma Yahoo-sök som /api/bolagssok och skriver
// tillbaka ticker och land, men BARA där ticker saknas. Befintliga värden rörs
// aldrig, och inget annat fält skrivs.
//
//   node tools/fyll-tickers.mjs          visar vad som skulle fyllas i
//   node tools/fyll-tickers.mjs --kor    skriver

import { readFileSync } from 'fs';

const p = rel => new URL(rel, import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const LAND = { ST: 'SE', OL: 'NO', CO: 'DK', HE: 'FI', IC: 'IS' };

function laddaEnv() {
  for (const rad of readFileSync(p('../.env'), 'utf8').split(/\r?\n/)) {
    const m = rad.match(/^\s*([A-Z0-9_]+)\s*=\s*(.+?)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}

async function slaUpp(namn) {
  const url = `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(namn)}&quotesCount=20&newsCount=0`;
  const r = await fetch(url, { headers: { 'user-agent': 'Mozilla/5.0', accept: 'application/json' } });
  if (!r.ok) return null;
  for (const x of (await r.json()).quotes || []) {
    if (x.quoteType !== 'EQUITY' || !x.symbol) continue;
    const punkt = String(x.symbol).lastIndexOf('.');
    if (punkt === -1) continue;
    const land = LAND[String(x.symbol).slice(punkt + 1).toUpperCase()];
    if (!land) continue;
    return { ticker: String(x.symbol).slice(0, punkt).toUpperCase(), land, namn: (x.longname || x.shortname || '').trim() };
  }
  return null;
}

laddaEnv();
const bas = process.env.SUPABASE_URL, hemlig = process.env.SUPABASE_SECRET_KEY;
if (!bas || !hemlig) { console.error('SUPABASE_URL och SUPABASE_SECRET_KEY behövs i .env.'); process.exit(1); }
const H = { apikey: hemlig, Authorization: 'Bearer ' + hemlig, 'Content-Type': 'application/json' };
const kor = process.argv.includes('--kor');

const innehav = await (await fetch(`${bas}/rest/v1/holdings?select=id,name,ticker`, { headers: H })).json();
const utan = innehav.filter(h => !h.ticker);
console.log(`${innehav.length} innehav, ${utan.length} utan ticker.\n`);

for (const h of utan) {
  const f = await slaUpp(h.name);
  if (!f) { console.log(`  ?  ${h.name}  ->  ingen nordisk notering hittad, lämnas som den är`); continue; }
  // Yahoo svarar på ungefärliga namn. Kräv att bolagsnamnen delar sitt första ord,
  // annars är det lika gärna ett grannbolag (sök "ferro" och Ferronordic svarar).
  const forsta = s => String(s).toLowerCase().replace(/[^a-zà-ÿ0-9 ]/g, ' ').trim().split(/\s+/)[0] || '';
  if (forsta(h.name) !== forsta(f.namn)) {
    console.log(`  !  ${h.name}  ->  ${f.ticker} (${f.namn}), namnen matchar inte, hoppar över`);
    continue;
  }
  console.log(`  ${kor ? '+' : '·'}  ${h.name}  ->  ${f.ticker} / ${f.land}   (${f.namn})`);
  if (!kor) continue;
  const r = await fetch(`${bas}/rest/v1/holdings?id=eq.${h.id}`, {
    method: 'PATCH', headers: { ...H, Prefer: 'return=minimal' },
    body: JSON.stringify({ ticker: f.ticker }),
  });
  if (!r.ok) console.log(`     skrivning misslyckades: HTTP ${r.status}`);
}

if (!kor) console.log('\nTorrkörning. Kör med --kor för att skriva.');
