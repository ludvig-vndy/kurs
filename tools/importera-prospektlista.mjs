/* tools/importera-prospektlista.mjs
 *
 * Lyfter in ett färdigt uttag från lead-scrapern i Supabase som en
 * prospektlista. Scrapern producerar raderna, det här skriptet publicerar dem.
 *
 * Kör:
 *   SUPABASE_SECRET_KEY=... node tools/importera-prospektlista.mjs \
 *     --fil ../VNDY/scraper/vndy-scraper/data/prospekt/el-vvs-vg.json \
 *     --slug el-vvs-vastra-gotaland \
 *     --namn "Installatörer i Väst" \
 *     [--publicera] [--kop ludvig@vndy.se,sebastian@vndy.se]
 *
 * Idempotent: samma slug uppdaterar listan och ersätter dess rader.
 * Deltagarnas arbete hänger på rad-id, så rader raderas ALDRIG när listan
 * redan är publicerad. Vill man byta ut raderna får man skapa en ny slug.
 */

import { readFileSync } from 'node:fs';
import process from 'node:process';

const FALLBACK_URL = 'https://xpxghvxrckpzbbkjmtcw.supabase.co';

function arg(namn, standard = null) {
  const i = process.argv.indexOf('--' + namn);
  if (i < 0) return standard;
  const v = process.argv[i + 1];
  return v && !v.startsWith('--') ? v : true;
}

/* --torrkorning läser filen, gör hela översättningen och visar vad som skulle
   skrivas, utan att röra databasen. Kör den först, alltid. */
const TORR = process.argv.includes('--torrkorning');

const SECRET = process.env.SUPABASE_SECRET_KEY;
const BASE = process.env.SUPABASE_URL || FALLBACK_URL;
if (!SECRET && !TORR) {
  console.error('SUPABASE_SECRET_KEY saknas i miljön. Kör med --torrkorning för att bara se mappningen.');
  process.exit(1);
}

const fil = arg('fil');
const slug = arg('slug');
const namn = arg('namn');
if (!fil || !slug || !namn) {
  console.error('Kräver --fil, --slug och --namn. Se kommentaren överst i filen.');
  process.exit(1);
}

const H = {
  apikey: SECRET,
  Authorization: 'Bearer ' + SECRET,
  'Content-Type': 'application/json',
};

async function sb(metod, path, body, prefer) {
  const r = await fetch(BASE + '/rest/v1/' + path, {
    method: metod,
    headers: prefer ? { ...H, Prefer: prefer } : H,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await r.text();
  if (!r.ok) throw new Error(`${metod} ${path} -> ${r.status}: ${text.slice(0, 300)}`);
  return text ? JSON.parse(text) : null;
}

// ── Läs uttaget ───────────────────────────────────────────────────────
const kalla = JSON.parse(readFileSync(fil, 'utf8'));
const rader = Array.isArray(kalla) ? kalla : kalla.rows;
if (!Array.isArray(rader) || !rader.length) {
  console.error('Hittade inga rader i ' + fil);
  process.exit(1);
}
console.log(`Läste ${rader.length} rader ur ${fil}`);

const STATUS_TILL_BAND = r => r['Anställdaband'] || null;

const till_rad = r => ({
  nr: r.Nr,
  prio: r.Prio,
  foretag: r['Företag'],
  orgnr: r.Orgnr || null,
  kommun: r.Kommun || null,
  ort: r.Ort || null,
  postnr: r.Postnr || null,
  adress: r.Adress || null,
  verksamhet: r.Verksamhet || null,
  anstallda_bolag: r['Anställda bolag'] ?? null,
  anstallda_arbetsstalle: r['Anställda'] || null,
  anstallda_band: STATUS_TILL_BAND(r),
  omsattning_tkr: r['Omsättning'] ?? null,
  omsattning_ar: r['Omsättningsår'] ?? null,
  omsattning_band: r['Omsättningsband'] || null,
  koncernlage: r['Koncernläge'] || null,
  moderbolag: r.Moderbolag || null,
  vd: r.Kontaktperson || null,
  telefon: r.Telefon || null,
  epost: r['E-post'] || null,
  kanaler: r['Tillåtna kanaler'] || 'Okänd',
  notering: r.Notering || null,
});

// ── Lista ─────────────────────────────────────────────────────────────
const listrad = {
  slug,
  namn,
  ingress: arg('ingress') || null,
  segment: arg('segment') || null,
  geografi: arg('geografi') || null,
  urval: arg('urval') || null,
  population: arg('population') ? Number(arg('population')) : null,
  kallhanvisning: arg('kalla') ||
    'Källa: SCB, Statistiska centralbyrån, allmänna företagsregistret. Egen bearbetning.',
  uttag_datum: arg('datum') || new Date().toISOString().slice(0, 10),
  publicerad: arg('publicera') === true,
};

if (TORR) {
  const saknarKanal = rader.filter((r) => !till_rad(r).kanaler || till_rad(r).kanaler === 'Okänd').length;
  const medVd = rader.filter((r) => till_rad(r).vd).length;
  const prio = rader.reduce((a, r) => ((a[r.Prio] = (a[r.Prio] || 0) + 1), a), {});
  console.log('\nTORRKÖRNING, ingenting skrivs.\n');
  console.log('Lista:', JSON.stringify(listrad, null, 2));
  console.log(`\nRader: ${rader.length}  ${JSON.stringify(prio)}`);
  console.log(`Med namngiven VD: ${medVd}`);
  console.log(`Utan känd kanal (blir "Okänd"): ${saknarKanal}`);
  console.log('\nFörsta raden översatt:');
  console.log(JSON.stringify(till_rad(rader[0]), null, 2));
  const tomma = Object.entries(till_rad(rader[0])).filter(([, v]) => v === null).map(([k]) => k);
  if (tomma.length) console.log('\nTomma fält på första raden:', tomma.join(', '));
  process.exit(0);
}

await sb('POST', 'prospekt_lista?on_conflict=slug', [listrad],
  'resolution=merge-duplicates,return=minimal');
const [lista] = await sb('GET', `prospekt_lista?select=id,publicerad&slug=eq.${encodeURIComponent(slug)}`);
console.log(`Lista ${slug} -> ${lista.id} (publicerad: ${lista.publicerad})`);

// ── Rader ─────────────────────────────────────────────────────────────
const befintliga = await sb('GET', `prospekt_rad?select=id&lista_id=eq.${lista.id}&limit=1`);
if (befintliga.length && lista.publicerad) {
  console.log('Listan är publicerad och har redan rader. Uppdaterar utan att radera,');
  console.log('så deltagarnas arbete inte tappar sina rad-id.');
}

const paket = [];
for (let i = 0; i < rader.length; i += 200) {
  paket.push(rader.slice(i, i + 200).map(r => ({ lista_id: lista.id, ...till_rad(r) })));
}
let n = 0;
for (const p of paket) {
  await sb('POST', 'prospekt_rad?on_conflict=lista_id,nr', p,
    'resolution=merge-duplicates,return=minimal');
  n += p.length;
  console.log(`  ... ${n}/${rader.length}`);
}

// ── Köp ───────────────────────────────────────────────────────────────
const kop = arg('kop');
if (typeof kop === 'string' && kop.trim()) {
  const adresser = kop.split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
  await sb('POST', 'prospekt_kop?on_conflict=lista_id,epost',
    adresser.map(epost => ({ lista_id: lista.id, epost, kalla: 'manuell' })),
    'resolution=merge-duplicates,return=minimal');
  console.log(`Gav åtkomst till: ${adresser.join(', ')}`);
}

console.log(`\nKlart. ${n} rader i ${slug}.`);
if (!lista.publicerad) console.log('Listan är INTE publicerad än. Kör om med --publicera.');
