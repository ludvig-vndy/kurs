// Motparternas EGEN kommunikation till Frågas underlag.
//
//   node motor/bygg-motparter.mjs          visar vad som skulle skrivas
//   node motor/bygg-motparter.mjs --kor    skriver till KV (arkiv:motpart)
//
// Varför den finns
// ----------------
// Arkivet innehåller bara de bevakade bolagens egna pressmeddelanden från MFN.
// En pilot frågade om Unibaps koppling till ett avtal Loft Orbital slöt med
// Frankrike, och svaret blev att dokumentet saknades i underlaget. Nyheten kom
// från Loft Orbital och Orbitworks, inte från Unibap, så den kunde aldrig
// finnas i arkivet oavsett hur mycket som skrivits om den.
//
// Det svar som efterfrågades var inte en gissning utan två belagda uppgifter
// bredvid varandra: Unibap har ett ramavtal med Loft Orbital, och Loft Orbital
// har slutit ett avtal med Frankrike. Läsaren drar slutsatsen själv. Den andra
// uppgiften kräver motpartens egen källa, och det är allt den här filen gör.
//
// HANDPLOCKAT, INTE SÖKT. motor/motparter.json listar vilka motparter som är
// värda att bevaka per innehav. Ingen sökmotor, inga gissade domäner, ingen
// öppen webb: kända adresser, känd form, och källan syns i svaret.
//
// NIVÅ 2, INTE NIVÅ 1. Ett onoterat bolags nyhetsrum är marknadsföring, inte
// reglerad information. Ett avtal de själva säger är värt en miljard dollar är
// deras uppgift, inte en reviderad siffra. Posterna bär därför en egen typ
// hela vägen ut i svaret, så en läsare aldrig förväxlar dem med ett
// MAR-pliktigt pressmeddelande.
//
// Ta bort filen ur nattjobbet för att stänga vägen utan att röra något annat.

import { readFileSync, existsSync, writeFileSync, mkdirSync } from 'fs';
import { execFileSync } from 'child_process';
import { pathToFileURL } from 'url';

const p = rel => new URL(rel, import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const NS = '97d78256ff664c54a724878034c8f0fd'; // upptack-data, samma som bygg-arkiv.mjs
const NYCKEL = 'arkiv:motpart';

const BITSTORLEK = 1200;
const MAX_BITAR = 6;      // per motpart och sida: ett nyhetsrum, inte ett arkiv
const MAX_BYTE = 200 * 1024;
const TIMEOUT = 20000;

function wrangler(args, { tystFel = false } = {}) {
  return execFileSync('npx', ['--yes', 'wrangler@4', ...args], {
    encoding: 'utf8', stdio: ['ignore', 'pipe', tystFel ? 'ignore' : 'inherit'],
    shell: process.platform === 'win32',
  });
}

function kvSkriv(nyckel, varde) {
  const tmp = p(`./out/kv-${nyckel.replace(/[^a-z0-9]/gi, '-')}.json`);
  mkdirSync(p('./out'), { recursive: true });
  writeFileSync(tmp, JSON.stringify(varde));
  wrangler(['kv', 'key', 'put', '--namespace-id=' + NS, nyckel, '--path=' + tmp, '--remote']);
}

/* Bara ren text, och bara det som ser ut som innehåll. Script och style måste
   bort FÖRE taggarna, annars blir deras innehåll till "text". */
export function textUrHtml(html) {
  return String(html || '')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ').replace(/&amp;/gi, '&').replace(/&#39;/g, "'")
    .replace(/&quot;/gi, '"').replace(/&lt;/gi, '<').replace(/&gt;/gi, '>')
    .replace(/[ \t ]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function bitar(text, max = MAX_BITAR) {
  const ut = [];
  let ack = '';
  for (const mening of String(text).split(/(?<=[.!?])\s+/)) {
    ack += mening + ' ';
    if (ack.length > BITSTORLEK) { ut.push(ack.trim()); ack = ''; }
    if (ut.length >= max) return ut;
  }
  if (ack.trim() && ut.length < max) ut.push(ack.trim());
  return ut;
}

export function lasLista() {
  const fil = p('./motparter.json');
  if (!existsSync(fil)) return [];
  const d = JSON.parse(readFileSync(fil, 'utf8'));
  return (d.motparter || []).filter(m =>
    m && typeof m.bolag === 'string' && typeof m.motpart === 'string' &&
    Array.isArray(m.urler) && m.urler.every(u => /^https:\/\//.test(u)));
}

async function hamtaSida(url) {
  const ctrl = new AbortController();
  const klocka = setTimeout(() => ctrl.abort(), TIMEOUT);
  try {
    const r = await fetch(url, { signal: ctrl.signal,
      headers: { 'user-agent': 'Mozilla/5.0 (agarkollen-alpha; dokumenthamtning for intern analys)' } });
    if (!r.ok) return { av: 'HTTP ' + r.status };
    const html = await r.text();
    if (html.length > MAX_BYTE) return { text: textUrHtml(html.slice(0, MAX_BYTE)), kapad: true };
    return { text: textUrHtml(html) };
  } catch (e) {
    return { av: e?.name === 'AbortError' ? 'tidsgräns' : String(e.message || e).slice(0, 60) };
  } finally { clearTimeout(klocka); }
}

export async function byggMotparter(lista, hamtare = hamtaSida) {
  const ut = [];
  for (const m of lista) {
    const dokument = [];
    for (const url of m.urler) {
      const r = await hamtare(url);
      if (r.av || !r.text) { console.log(`  ${m.motpart}: ${url} hoppades över (${r.av || 'tom sida'})`); continue; }
      const stycken = bitar(r.text);
      if (!stycken.length) { console.log(`  ${m.motpart}: ${url} gav ingen läsbar text`); continue; }
      dokument.push({ url, rubrik: m.motpart + ', egen kommunikation', bitar: stycken });
      console.log(`  ${m.motpart}: ${url} gav ${stycken.length} bitar, ${r.text.length} tecken${r.kapad ? ' (kapad)' : ''}`);
    }
    if (dokument.length) ut.push({ bolag: m.bolag, motpart: m.motpart, dokument });
  }
  return { uppdaterad: new Date().toISOString(), niva: 2, motparter: ut };
}

async function main() {
  const kor = process.argv.includes('--kor');
  const lista = lasLista();
  if (!lista.length) { console.log('motor/motparter.json är tom eller saknas. Inget att hämta.'); return; }
  console.log(`Hämtar ${lista.length} motpart(er).`);
  const bok = await byggMotparter(lista);
  const dok = bok.motparter.reduce((s, m) => s + m.dokument.length, 0);
  console.log(`\n${bok.motparter.length} motparter, ${dok} sidor.`);
  if (!kor) { console.log('Torrkörning. Kör med --kor för att skriva till KV.'); return; }
  if (!dok) { console.log('Inget hämtat, skriver inte över det som ligger i KV.'); return; }
  kvSkriv(NYCKEL, bok);
  console.log(`Publicerat motparter till ${NYCKEL}.`);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) main();
