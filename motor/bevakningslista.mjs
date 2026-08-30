// Bygger motorns bevakningslista ur användarnas Supabase-innehav. Brevet ska
// handla om bolagen läsaren faktiskt äger eller bevakar, inget annat, så listan
// ÄR innehaven. "Lägg till bolag i Delägaren" == "motorn bevakar det i morgon",
// och "ta bort" == "det försvinner ur brevet".
//
// bolag.json är inte längre en lista över vad som bevakas, utan en katalog över
// verifierade MFN-flöden: matchar ett innehav ett namn där tas flödet därifrån.
// Övriga innehav slås upp mot MFN: namnet sluggas, kandidat-URL:er provas, och
// en tas med bara om flödet faktiskt ger artikellänkar. Resultatet cachas
// (motor/in/bevakning-cache.json) så vi inte slår mot MFN varje natt.
//
// Enda undantaget: utan Supabase-nycklar i miljön finns inga innehav att läsa,
// och då faller den tillbaka på katalogen så att en torrkörning har något att
// göra. I skarp drift är nycklarna satta och listan är enbart innehaven.
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
// gemener. Namnen i bolag.json slås upp i katalogen först, så här bara extra.
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
  if (!base || !secret) return null; // ingen Supabase -> kör bara katalogen
  const url = `${base}/rest/v1/holdings?select=name,ticker,relation,user_id`;
  const r = await fetch(url, { headers: { apikey: secret, Authorization: 'Bearer ' + secret } });
  if (!r.ok) throw new Error('Supabase holdings: HTTP ' + r.status);
  return await r.json();
}

// Löst namnmatch åt båda håll: "Unibap Space Solutions" i innehavet ska hitta
// "Unibap" i katalogen, och tvärtom.
function liknar(a, b) { return a === b || a.startsWith(b) || b.startsWith(a); }

// Bygger bevakningslistan ur innehaven. seed = parsad bolag.json (flödeskatalog).
export async function byggBevakning(seed) {
  laddaEnv();
  const katalog = seed.bolag || [];
  const orapporterade = [];

  let innehav;
  try { innehav = await hamtaInnehav(); }
  catch (e) { console.log('  Kunde inte läsa innehav:', e.message); return { bolag: [...katalog], orapporterade, kalla: 'katalog' }; }
  if (!innehav) return { bolag: [...katalog], orapporterade, kalla: 'katalog' }; // ingen Supabase konfigurerad

  // Unika bolagsnamn ur innehaven (alla användares, alla relationer: äger och
  // bevakar). Motorn hämtar dokumenten EN gång per bolag oavsett hur många som
  // äger det, men vem som äger vad måste följa med: brevet är personligt, och
  // två användares portföljer får aldrig blandas i samma brev.
  const namn = [];
  const sett = new Set();
  const agare = new Map();   // kanoniskt bolagsnamn -> Set(user_id)
  for (const h of innehav) {
    const n = String(h.name || '').trim();
    if (!n) continue;
    const key = n.toLowerCase();
    const redan = namn.find(m => liknar(key, m.toLowerCase()));
    const kanoniskt = redan || n;
    if (!redan && !sett.has(key)) { sett.add(key); namn.push(n); }
    if (!agare.has(kanoniskt)) agare.set(kanoniskt, new Set());
    if (h.user_id) agare.get(kanoniskt).add(h.user_id);
  }

  const cacheFil = p('./in/bevakning-cache.json');
  const cache = existsSync(cacheFil) ? JSON.parse(readFileSync(cacheFil, 'utf8')) : {};
  let cacheAndrad = false;
  const bolag = [];

  for (const n of namn) {
    // Känt flöde ur katalogen först, annars slå upp mot MFN.
    const key = n.toLowerCase();
    const kat = katalog.find(b => liknar(key, String(b.namn).toLowerCase()));
    if (kat) { bolag.push({ ...kat, namn: kat.namn, kalla: 'innehav', agare: [...(agare.get(n) || [])] }); continue; }

    let post = cache[n];
    if (post === undefined) {
      const funnet = await hittaFlode(n);
      post = funnet ? { slug: funnet.slug, feed: funnet.feed } : null;
      cache[n] = post; cacheAndrad = true;
    }
    if (post) bolag.push({ id: post.slug, namn: n, feed: post.feed, maxNya: 6, kalla: 'innehav', agare: [...(agare.get(n) || [])] });
    else orapporterade.push(n);
  }

  if (cacheAndrad) { try { writeFileSync(cacheFil, JSON.stringify(cache, null, 2)); } catch {} }
  return { bolag, orapporterade, kalla: 'innehav' };
}

// Fristående körning: skriv ut den härledda listan.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const seed = JSON.parse(readFileSync(p('./bolag.json'), 'utf8'));
  const { bolag, orapporterade, kalla } = await byggBevakning(seed);
  console.log(`\nBevakningslista: ${bolag.length} bolag (ur ${kalla === 'innehav' ? 'innehaven' : 'katalogen, ingen Supabase'})`);
  for (const b of bolag) console.log(`  ${b.kalla === 'innehav' ? '+' : '·'} ${b.namn}  ->  ${b.feed}`);
  if (orapporterade.length) {
    console.log(`\nKunde inte hitta MFN-flöde för ${orapporterade.length} innehav (bevakas ej än):`);
    for (const n of orapporterade) console.log(`  ? ${n}`);
  }
}
