// Bygger Frågas dokumentarkiv och lägger det i KV, ett värde per bolag.
//
// Fråga behöver samma texter som motorn läser, men på edgen. De ligger i
// motor/in/*.txt, som är gitignorerat och dessutom tomt på en färsk CI-maskin:
// nattjobbet hämtar bara NYA dokument. Arkivet måste därför ackumuleras i KV,
// på samma sätt som motor-state. Varje körning läser det som redan ligger där,
// lägger till nattens dokument och skriver tillbaka.
//
//   node motor/bygg-arkiv.mjs           visar vad som skulle skrivas
//   node motor/bygg-arkiv.mjs --kor     skriver till KV
//   node motor/bygg-arkiv.mjs --fyll    hämtar först text för bevakade bolag som
//                                       saknar dokument i arkivet
//
// --fyll finns för att arkivet och brevet inte är samma sak. Brevet handlar om
// det som är NYTT, och därför hämtar nattjobbet bara nya dokument. Arkivet ska
// kunna svara på "hur ser kassan ut", och då behövs den senaste rapporten även
// när den är gammal nyhet. Påfyllningen läser flödet och hämtar texten rakt av,
// utan ett enda modellanrop, så den kostar ingenting utom bandbredd.
//
// Nycklar: arkiv:<bolagsid> per bolag, arkiv:index med listan.

import { readFileSync, existsSync, writeFileSync, readdirSync, mkdirSync } from 'fs';
import { execFileSync } from 'child_process';
import { pathToFileURL } from 'url';
import { hamta } from './hamta.mjs';
import { byggBevakning } from './bevakningslista.mjs';

const p = rel => new URL(rel, import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const NS = 'f155742e0cb14bb390fced9aea5ca641'; // KV-namespace "upptack-data" (delas)

// Tak per bolag. KV klarar 25 MB per värde, men det är inte gränsen som räknas:
// arkivet läses vid varje fråga, och ett stort värde gör varje fråga långsammare.
// Nyaste dokumenten först, sedan kapas det som inte får plats.
const MAX_DOK = 40;
const MAX_BYTE = 700 * 1024;
const BITSTORLEK = 1200;

function wrangler(args, { tystFel = false } = {}) {
  return execFileSync('npx', ['--yes', 'wrangler@4', ...args], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', tystFel ? 'ignore' : 'inherit'],
    shell: process.platform === 'win32',
  });
}

function kvLas(nyckel) {
  try {
    const ut = wrangler(['kv', 'key', 'get', '--namespace-id=' + NS, nyckel, '--remote'], { tystFel: true });
    const start = ut.indexOf('{');
    const startArr = ut.indexOf('[');
    const i = start === -1 ? startArr : (startArr === -1 ? start : Math.min(start, startArr));
    return i === -1 ? null : JSON.parse(ut.slice(i));
  } catch { return null; }
}

function kvSkriv(nyckel, varde) {
  const tmp = p(`./out/kv-${nyckel.replace(/[^a-z0-9]/gi, '-')}.json`);
  mkdirSync(p('./out'), { recursive: true });
  writeFileSync(tmp, JSON.stringify(varde));
  wrangler(['kv', 'key', 'put', '--namespace-id=' + NS, nyckel, '--path=' + tmp, '--remote']);
}

// Text -> bitar på meningsgräns, som i motor/fraga.mjs.
function bitar(text) {
  const ut = [];
  let ack = '';
  for (const mening of text.split(/(?<=[.!?])\s+/)) {
    ack += mening + ' ';
    if (ack.length > BITSTORLEK) { ut.push(ack.trim()); ack = ''; }
  }
  if (ack.trim()) ut.push(ack.trim());
  return ut;
}

// Bolagen motorn har data för. -insyn.json är aggregat, inte dokument.
function bolagsfiler() {
  const dir = p('./out/data');
  if (!existsSync(dir)) return [];
  return readdirSync(dir).filter(f => f.endsWith('.json') && !f.endsWith('-insyn.json'));
}

// Dokumentets textfil, namngiven som natt.mjs gör det.
function textFor(bolagsId, url) {
  const slug = url.split('/').pop();
  for (const suffix of ['', '-bilaga']) {
    const fil = p(`./in/${bolagsId}-${slug.slice(0, 60)}${suffix}.txt`);
    if (existsSync(fil)) return readFileSync(fil, 'utf8');
  }
  return null;
}

// Samma mönster som natt.mjs använder för att plocka artikellänkar ur ett flöde.
const LANKRE = /href="((?:https:\/\/mfn\.se)?\/(?:[a-z]+\/)?a\/[a-z0-9-]+\/[^"/]+)"/g;
const PER_BOLAG = 12;
// Rapporterna ar det arkivet star och faller med: kassa, intakter och
// rorelseresultat finns bara dar. I ett aktivt bolags flode ar de tolv senaste
// posterna mestadels pressmeddelanden, sa rapporterna hamtas separat oavsett hur
// langt ned i flodet de ligger. Matningen visade skillnaden: parsern klarade
// Saniona men saknade helt enkelt rapporter att lasa for de andra.
const RAPPORT = /(delarsrapport|delårsrapport|bokslutskommunike|bokslutskommuniké|interim-report|year-end-report|quarterly-report|kvartalsrapport|rapport-for)/i;
const RAPPORTER_MAX = 8;

/* Hämtar text för bevakade bolag som saknar dokument på disk, så arkivet kan
   svara även om nattjobbet aldrig såg dokumenten som nya. Skriver samma filer
   och samma out/data-form som natt.mjs, så byggBolag inte behöver veta något. */
async function fyllPa() {
  const seed = JSON.parse(readFileSync(p('./bolag.json'), 'utf8'));
  const { bolag } = await byggBevakning(seed);
  console.log(`Fyller på ur ${bolag.length} bevakade bolag.`);
  console.log('');

  for (const b of bolag) {
    const dataFil = p(`./out/data/${b.id}.json`);
    const data = existsSync(dataFil)
      ? JSON.parse(readFileSync(dataFil, 'utf8'))
      : { id: b.id, namn: b.namn, dokument: [] };
    const kanda = new Set(data.dokument.map(d => d.url));

    let html;
    try { html = await (await fetch(b.feed, { headers: { 'user-agent': 'Mozilla/5.0 (agarkollen-alpha)' } })).text(); }
    catch { console.log(`  ${b.namn}: flödet svarade inte, hoppar över`); continue; }
    const lankar = [];
    LANKRE.lastIndex = 0;
    let m;
    while ((m = LANKRE.exec(html)) !== null) {
      const u = m[1].startsWith('http') ? m[1] : 'https://mfn.se' + m[1];
      if (!lankar.includes(u)) lankar.push(u);
    }

    // Senaste posterna, plus rapporterna var de an ligger i flodet.
    const rapporter = lankar.filter(u => RAPPORT.test(u.split('/').pop())).slice(0, RAPPORTER_MAX);
    const attHamta = [...new Set([...lankar.slice(0, PER_BOLAG), ...rapporter])];

    let nya = 0;
    for (const url of attHamta) {
      const slug = url.split('/').pop();
      const namn = `${b.id}-${slug.slice(0, 60)}`;
      if (kanda.has(url) && existsSync(p(`./in/${namn}.txt`))) continue;
      try {
        const h = await hamta(url, namn);
        if (h.typ !== 'text') continue;
        const text = readFileSync(h.fil, 'utf8');
        const rubrikRad = text.split(String.fromCharCode(10)).find(r => r.trim().length > 25);
        if (!kanda.has(url)) {
          data.dokument.push({
            url, typ: 'arkiv',
            rubrik: rubrikRad ? rubrikRad.split('>').pop().trim().slice(0, 140) : slug.replace(/-[a-f0-9]+$/, '').replace(/-/g, ' '),
            datum: new Date().toISOString().slice(0, 10),
          });
          kanda.add(url);
        }
        nya++;
      } catch { /* enstaka dokument far falla */ }
    }
    mkdirSync(p('./out/data'), { recursive: true });
    writeFileSync(dataFil, JSON.stringify(data, null, 1));
    console.log(`  ${b.namn.padEnd(34)} ${String(nya).padStart(3)} texter hämtade`);
  }
  console.log('');
}

export function byggBolag(bolagsId, befintligt) {
  const data = JSON.parse(readFileSync(p(`./out/data/${bolagsId}.json`), 'utf8'));
  // Det som redan ligger i KV behålls: texterna finns inte kvar på disk i CI.
  const kandaUrler = new Map((befintligt?.dokument || []).map(d => [d.url, d]));

  for (const dok of data.dokument || []) {
    if (dok.dublett_av || dok.fel) continue;
    if (kandaUrler.has(dok.url)) continue;
    const text = textFor(bolagsId, dok.url);
    if (!text || text.length < 200) continue;
    kandaUrler.set(dok.url, {
      url: dok.url,
      rubrik: dok.rubrik || '',
      datum: dok.datum || '',
      typ: dok.typ || 'ovrigt',
      bitar: bitar(text),
    });
  }

  // Nyast först, sedan kapa på antal och storlek.
  const dokument = [...kandaUrler.values()]
    .sort((a, b) => String(b.datum).localeCompare(String(a.datum)))
    .slice(0, MAX_DOK);
  while (dokument.length > 1 && JSON.stringify(dokument).length > MAX_BYTE) dokument.pop();

  return { id: bolagsId, namn: data.namn, uppdaterad: new Date().toISOString(), dokument };
}

export async function byggArkiv({ kor = false } = {}) {
  const index = [];
  for (const fil of bolagsfiler()) {
    const id = fil.replace(/\.json$/, '');
    const befintligt = kor ? kvLas('arkiv:' + id) : null;
    const arkiv = byggBolag(id, befintligt);
    if (!arkiv.dokument.length) continue;
    const byte = JSON.stringify(arkiv).length;
    const nya = arkiv.dokument.length - (befintligt?.dokument?.length || 0);
    console.log(`  ${arkiv.namn.padEnd(34)} ${String(arkiv.dokument.length).padStart(3)} dok  ${String(Math.round(byte / 1024)).padStart(4)} kB${kor && nya > 0 ? `  (+${nya})` : ''}`);
    if (kor) kvSkriv('arkiv:' + id, arkiv);
    index.push({ id, namn: arkiv.namn, dokument: arkiv.dokument.length, uppdaterad: arkiv.uppdaterad });
  }
  if (kor && index.length) kvSkriv('arkiv:index', index);
  return index;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const kor = process.argv.includes('--kor');
  if (process.argv.includes('--fyll')) await fyllPa();
  console.log(kor ? 'Bygger dokumentarkivet till KV:' : 'Torrkörning, inget skrivs:');
  const index = await byggArkiv({ kor });
  console.log(`\n${index.length} bolag${kor ? ' skrivna till KV (arkiv:<id> + arkiv:index).' : '. Kör med --kor för att skriva.'}`);
}
