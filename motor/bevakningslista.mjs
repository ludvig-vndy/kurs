// Bygger motorns bevakningslista ur användarnas Supabase-innehav, inte bara den
// statiska bolag.json. Så blir "lägg till bolag i Delägaren" == "motorn börjar
// bevaka bolaget i morgondagens brev".
//
// Flöde: seed (bolag.json, de kurerade med verifierade MFN-flöden + konkurrenter)
//   UNION innehav (holdings i Supabase, läst med secret key -> alla användares).
// Varje innehav utan känt flöde slås upp mot MFN: namnet sluggas, kandidat-URL:er
// provas, och en tas med bara om flödet faktiskt ger artikellänkar. Resultatet
// cachas (motor/in/bevakning-cache.json) så vi inte slår mot MFN varje natt.
//
// Kör fristående för test:  node motor/bevakningslista.mjs
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { pathToFileURL } from 'url';

const p = rel => new URL(rel, import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const UA = { 'user-agent': 'Mozilla/5.0 (agarkollen-alpha)' };
// Samma mönster som natt.mjs använder för att plocka artikellänkar ur ett flöde.
const LANKRE = /href="((?:https:\/\/mfn\.se)?\/(?:[a-z]+\/)?a\/[a-z0-9-]+\/[^"/]+)"/g;

// Fyller process.env ur repo-.env för nycklar som saknas (motorn laddar ingen
// dotenv annars). Rör bara det som inte redan är satt i miljön.
function laddaEnv() {
  try {
    const t = readFileSync(p('../.env'), 'utf8');
    for (const rad of t.split(/\r?\n/)) {
      const m = rad.match(/^\s*([A-Z0-9_]+)\s*=\s*(.+?)\s*$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
    }
  } catch { /* ingen .env, förlita på miljön */ }
}

// Kurerade namn->slug där en gissning inte träffar rätt. Substrängmatch på
// gemener. De sex i bolag.json ligger redan i seed, så här bara extra.
const KURERADE = [
  { match: 'sivers', slug: 'sivers-semiconductors' },
];

// Kandidat-sluggar ur ett bolagsnamn, mest sannolika först.
function sluggar(namn) {
  const bas = String(namn).toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')   // diakriter bort
    .replace(/\(.*?\)/g, ' ')                            // (publ) m.m.
    .replace(/[^a-z0-9\s-]/g, ' ')
    .replace(/\s+/g, ' ').trim();
  const bolagsord = new Set(['ab', 'publ', 'oyj', 'asa', 'plc', 'as', 'inc', 'corp', 'the', 'group']);
  const ord = bas.split(' ').filter(Boolean);
  const utanSuffix = ord.filter(o => !bolagsord.has(o));
  const kand = new Set();
  const slug = a => a.join('-');
  if (utanSuffix.length) kand.add(slug(utanSuffix));   // "sivers semiconductors ab (publ)" -> sivers-semiconductors
  kand.add(slug(ord));                                  // med suffix kvar
  if (utanSuffix.length >= 2) kand.add(slug(utanSuffix.slice(0, 2)));
  if (utanSuffix.length) kand.add(utanSuffix[0]);       // första ordet, sista utväg
  return [...kand].filter(s => s && s.length >= 3);
}

// Verifierar att ett MFN-flöde finns genom att det ger minst en artikellänk.
async function flodeGer(url) {
  try {
    const html = await (await fetch(url, { headers: UA })).text();
    LANKRE.lastIndex = 0;
    return LANKRE.test(html);
  } catch { return false; }
}

// namn -> MFN-flöde (verifierat) eller null. Provar kurerad slug, sen kandidater.
async function hittaFlode(namn) {
  const lc = String(namn).toLowerCase();
  const kur = KURERADE.find(k => lc.includes(k.match));
  const kandidatSlugs = kur ? [kur.slug, ...sluggar(namn)] : sluggar(namn);
  for (const slug of kandidatSlugs) {
    const url = `https://mfn.se/all/a/${slug}`;
    if (await flodeGer(url)) return { slug, feed: url };
  }
  return null;
}

async function hamtaInnehav() {
  const base = process.env.SUPABASE_URL;
  const secret = process.env.SUPABASE_SECRET_KEY;
  if (!base || !secret) return null; // ingen Supabase -> kör bara seed
  const url = `${base}/rest/v1/holdings?select=name,ticker,relation`;
  const r = await fetch(url, { headers: { apikey: secret, Authorization: 'Bearer ' + secret } });
  if (!r.ok) throw new Error('Supabase holdings: HTTP ' + r.status);
  return await r.json();
}

// Bygger den slutliga bolag-listan. seed = parsad bolag.json.
export async function byggBevakning(seed) {
  laddaEnv();
  const bolag = [...(seed.bolag || [])];
  const kandNamn = new Set(bolag.map(b => b.namn.toLowerCase().trim()));
  const orapporterade = [];

  let innehav;
  try { innehav = await hamtaInnehav(); }
  catch (e) { console.log('  Kunde inte läsa innehav:', e.message); return { bolag, orapporterade }; }
  if (!innehav) return { bolag, orapporterade }; // ingen Supabase konfigurerad

  // Unika bolagsnamn ur innehaven som inte redan bevakas.
  const nyaNamn = [];
  const settNamn = new Set(kandNamn);
  for (const h of innehav) {
    const n = String(h.name || '').trim();
    if (!n) continue;
    const key = n.toLowerCase();
    // Redan i seed via löst namnmatch (t.ex. "Unibap Space Solutions" ~ seed "Unibap...").
    const iSeed = [...kandNamn].some(s => key.startsWith(s) || s.startsWith(key));
    if (iSeed || settNamn.has(key)) continue;
    settNamn.add(key);
    nyaNamn.push(n);
  }

  const cacheFil = p('./in/bevakning-cache.json');
  const cache = existsSync(cacheFil) ? JSON.parse(readFileSync(cacheFil, 'utf8')) : {};
  let cacheAndrad = false;

  for (const namn of nyaNamn) {
    let post = cache[namn];
    if (post === undefined) {
      const funnet = await hittaFlode(namn);
      post = funnet ? { slug: funnet.slug, feed: funnet.feed } : null;
      cache[namn] = post; cacheAndrad = true;
    }
    if (post) bolag.push({ id: post.slug, namn, feed: post.feed, maxNya: 6, kalla: 'innehav' });
    else orapporterade.push(namn);
  }

  if (cacheAndrad) { try { writeFileSync(cacheFil, JSON.stringify(cache, null, 2)); } catch {} }
  return { bolag, orapporterade };
}

// Fristående körning: skriv ut den härledda listan.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const seed = JSON.parse(readFileSync(p('./bolag.json'), 'utf8'));
  const { bolag, orapporterade } = await byggBevakning(seed);
  console.log(`\nBevakningslista: ${bolag.length} bolag`);
  for (const b of bolag) console.log(`  ${b.kalla === 'innehav' ? '+' : '·'} ${b.namn}  ->  ${b.feed}`);
  if (orapporterade.length) {
    console.log(`\nKunde inte hitta MFN-flöde för ${orapporterade.length} innehav (bevakas ej än):`);
    for (const n of orapporterade) console.log(`  ? ${n}`);
  }
}
