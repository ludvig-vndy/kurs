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
 * Idempotent: samma slug uppdaterar listan, och raderna matchas på cfar.
 * Deltagarnas arbete hänger på cfar och inte på radens uuid, så ett omkört
 * uttag behåller anteckningarna även när rader tillkommer eller försvinner.
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
if (!fil || !slug) {
  console.error('Kräver --fil och --slug. --namn kan utelämnas om filen har meta.namn.');
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
// bygg_prospektlista.py skriver med sig urval, population och kallhanvisning.
// De blir standardvarden har, sa man slipper skriva om dem for hand.
const meta = (kalla && kalla.meta) || {};

// --namn far komma fran filens meta, sa bygg_prospektlista.py och det har
// verktyget kan kedjas utan att man skriver om samma sak.
const namn = arg('namn') || meta.namn;
if (!namn) {
  console.error('Namn saknas. Ange --namn eller lagg meta.namn i filen.');
  process.exit(1);
}
if (!Array.isArray(rader) || !rader.length) {
  console.error('Hittade inga rader i ' + fil);
  process.exit(1);
}
console.log(`Läste ${rader.length} rader ur ${fil}`);

// cfar ar nyckeln som barer deltagarnas arbete over ett omkort uttag.
// Saknas den nagonstans stannar vi hellre an skapar rader utan stabil nyckel.
const utanCfar = rader.filter(r => !String(r.CFAR || '').trim());
if (utanCfar.length) {
  console.error(`${utanCfar.length} rader saknar CFAR. Avbryter.`);
  console.error('Exempel: ' + utanCfar.slice(0, 3).map(r => r['Företag']).join(', '));
  process.exit(1);
}

const STATUS_TILL_BAND = r => r['Anställdaband'] || null;

// Prospektenheten ar bolaget. Scrapern levererar arbetsstallen, sa raderna
// viks ihop pa organisationsnummer har och inte i databasen.
const utanOrgnr = rader.filter(r => !String(r.Orgnr || '').replace(/\D/g, ''));
if (utanOrgnr.length) {
  console.error(`${utanOrgnr.length} rader saknar organisationsnummer. Avbryter.`);
  console.error('Exempel: ' + utanOrgnr.slice(0, 3).map(r => r['Företag']).join(', '));
  process.exit(1);
}

// Reklamsparren ar registrerad per arbetsstalle. Bolagets kanal ar darfor
// den mest restriktiva bland dess arbetsstallen: nekar ett enda stalle en
// kanal saknar bolaget den kanalen. Blandad sparr ar sallsynt, 1 bolag av
// 1 455 i tre uppmatta segment, och just darfor latt att missa.
const RANG = {
  'Telefon (EJ brev/mejl)': 0,
  'Brev och mejl (EJ telefon)': 0,
  'Brev, mejl och telefon': 1,
};
const strangast = (a, b) => {
  if (!a) return b;
  if (!b) return a;
  if (a === b) return a;
  if ((RANG[a] ?? 0) !== (RANG[b] ?? 0)) return (RANG[a] ?? 0) < (RANG[b] ?? 0) ? a : b;
  // Tva olika begransningar som inte overlappar: ingen kanal ar sakert tillaten.
  return 'Ingen kanal bekräftad';
};

const till_stalle = r => ({
  cfar: String(r.CFAR || '').trim(),
  huvudkontor: String(r['Arbetsställe'] || '').indexOf('Huvud') === 0,
  kommun: r.Kommun || null,
  ort: r.Ort || null,
  postnr: r.Postnr || null,
  adress: r.Adress || null,
  anstallda_klass: r['Anställda'] || null,
  telefon: r.Telefon || null,
  kanaler: r['Tillåtna kanaler'] || 'Okänd',
});

const till_bolag = r => ({
  orgnr: String(r.Orgnr).replace(/\D/g, ''),
  prio: r.Prio,
  foretag: r['Företag'],
  verksamhet: r.Verksamhet || null,
  anstallda: r['Anställda bolag'] ?? null,
  anstallda_band: STATUS_TILL_BAND(r),
  omsattning_tkr: r['Omsättning'] ?? null,
  omsattning_ar: r['Omsättningsår'] ?? null,
  omsattning_band: r['Omsättningsband'] || null,
  koncernlage: r['Koncernläge'] || null,
  moderbolag: r.Moderbolag || null,
  moderbolag_orgnr: r['Moderbolag orgnr'] ? String(r['Moderbolag orgnr']).replace(/\D/g, '') : null,
  kontakt_namn: r.Kontaktperson || null,
  kontakt_roll: r['Kontaktperson roll'] || (r.Kontaktperson ? 'Verkställande direktör' : null),
  kontakt_kalla: r['Kontakt källa'] || (r.Kontaktperson ? 'abpi' : null),
  hemsida: r.Hemsida || null,
  telefon: r.Telefon || null,
  telefon_kalla: r['Telefon källa'] || (r.Telefon ? 'scb' : null),
  epost: r['E-post'] || null,
  notering: r.Notering || null,
});

// Vik ihop. Huvudkontoret vinner nar arbetsstallena sager olika saker om
// bolaget, annars forsta raden. Prio blir den basta bland stallena, for ett
// bolag ar inte samre an sitt basta kontor.
const PRIO_RANG = { A: 0, B: 1, C: 2 };
const bolagPerOrgnr = new Map();
for (const r of rader) {
  const b = till_bolag(r), st = till_stalle(r);
  const fanns = bolagPerOrgnr.get(b.orgnr);
  if (!fanns) {
    bolagPerOrgnr.set(b.orgnr, { ...b, kanaler: st.kanaler, stallen: [st] });
    continue;
  }
  fanns.stallen.push(st);
  fanns.kanaler = strangast(fanns.kanaler, st.kanaler);
  if ((PRIO_RANG[b.prio] ?? 9) < (PRIO_RANG[fanns.prio] ?? 9)) fanns.prio = b.prio;
  if (st.huvudkontor) {
    for (const k of ['foretag', 'verksamhet', 'telefon', 'telefon_kalla', 'epost']) {
      if (b[k]) fanns[k] = b[k];
    }
  }
}
const bolagen = [...bolagPerOrgnr.values()]
  .sort((a, b) => (PRIO_RANG[a.prio] ?? 9) - (PRIO_RANG[b.prio] ?? 9) ||
                  (b.omsattning_tkr ?? -1) - (a.omsattning_tkr ?? -1))
  .map((b, i) => ({ ...b, nr: i + 1 }));

const kedjor = bolagen.filter(b => b.stallen.length > 1).length;
const koncerner = new Set(bolagen.map(b => b.moderbolag_orgnr || b.orgnr)).size;

// ── Lista ─────────────────────────────────────────────────────────────
const listrad = {
  slug,
  namn,
  ingress: arg('ingress') || meta.ingress || null,
  segment: arg('segment') || meta.segment || null,
  geografi: arg('geografi') || meta.geografi || null,
  urval: arg('urval') || meta.urval || null,
  population: arg('population') ? Number(arg('population')) : (meta.population ?? null),
  kallhanvisning: arg('kalla') || meta.kallhanvisning ||
    'Källa: SCB, Statistiska centralbyrån, allmänna företagsregistret. Egen bearbetning.',
  uttag_datum: arg('datum') || new Date().toISOString().slice(0, 10),
  publicerad: arg('publicera') === true,
};

if (TORR) {
  const saknarKanal = bolagen.filter(b => !b.kanaler || b.kanaler === 'Okänd').length;
  const medNamn = bolagen.filter(b => b.kontakt_namn).length;
  const prio = bolagen.reduce((a, b) => ((a[b.prio] = (a[b.prio] || 0) + 1), a), {});
  const storsta = [...bolagen].sort((a, b) => b.stallen.length - a.stallen.length)[0];
  const perKoncern = new Map();
  for (const b of bolagen) {
    const k = b.moderbolag || null;
    if (k) perKoncern.set(k, (perKoncern.get(k) || 0) + 1);
  }
  const topp = [...perKoncern.entries()].sort((a, b) => b[1] - a[1]).filter(([, n]) => n > 1);

  console.log('\nTORRKÖRNING, ingenting skrivs.\n');
  console.log('Lista:', JSON.stringify(listrad, null, 2));
  console.log(`\n${rader.length} arbetsställen  ->  ${bolagen.length} bolag  ${JSON.stringify(prio)}`);
  console.log(`${kedjor} bolag har fler än ett arbetsställe.`);
  if (storsta && storsta.stallen.length > 1) {
    console.log(`Störst: ${storsta.foretag}, ${storsta.stallen.length} arbetsställen.`);
  }
  console.log(`\n${koncerner} koncerner bland ${bolagen.length} bolag.`);
  if (topp.length) {
    console.log('Bolag som delar moderbolag med andra i listan:');
    for (const [m, n] of topp.slice(0, 5)) console.log(`  ${String(n).padStart(3)}  ${m}`);
    const iKluster = topp.reduce((a, [, n]) => a + n, 0);
    console.log(`  ${iKluster} av ${bolagen.length} bolag ligger i en koncern med fler träffar.`);
  }
  console.log(`\nMed registrerad kontaktperson: ${medNamn}`);
  console.log(`Utan känd kanal (blir "Okänd"): ${saknarKanal}`);
  const { stallen: _st, ...forsta } = bolagen[0];
  console.log('\nFörsta bolaget översatt:');
  console.log(JSON.stringify(forsta, null, 2));
  const tomma = Object.entries(forsta).filter(([, v]) => v === null).map(([k]) => k);
  if (tomma.length) console.log('\nTomma fält på första bolaget:', tomma.join(', '));
  process.exit(0);
}

await sb('POST', 'prospekt_lista?on_conflict=slug', [listrad],
  'resolution=merge-duplicates,return=minimal');
const [lista] = await sb('GET', `prospekt_lista?select=id,publicerad&slug=eq.${encodeURIComponent(slug)}`);
console.log(`Lista ${slug} -> ${lista.id} (publicerad: ${lista.publicerad})`);

// ── Bolag och arbetsställen ───────────────────────────────────────────
const befintliga = await sb('GET', `prospekt_bolag?select=id&lista_id=eq.${lista.id}&limit=1`);
if (befintliga.length && lista.publicerad) {
  console.log('Listan är publicerad och har redan bolag. Uppdaterar på orgnr,');
  console.log('så befintligt arbete följer med.');
}

let n = 0;
for (let i = 0; i < bolagen.length; i += 200) {
  const p = bolagen.slice(i, i + 200).map(({ stallen, ...b }) => ({ lista_id: lista.id, ...b }));
  await sb('POST', 'prospekt_bolag?on_conflict=lista_id,orgnr', p,
    'resolution=merge-duplicates,return=minimal');
  n += p.length;
  console.log(`  ... ${n}/${bolagen.length} bolag`);
}

// Arbetsställena behöver bolagets uuid, så id:na hämtas tillbaka en gång.
const idPerOrgnr = new Map();
for (let i = 0; i < bolagen.length; i += 500) {
  const del = bolagen.slice(i, i + 500).map(b => '"' + b.orgnr + '"').join(',');
  const svar = await sb('GET',
    `prospekt_bolag?select=id,orgnr&lista_id=eq.${lista.id}&orgnr=in.(${del})&limit=1000`);
  for (const b of svar) idPerOrgnr.set(b.orgnr, b.id);
}

const stallen = bolagen.flatMap(b =>
  b.stallen.map(st => ({ bolag_id: idPerOrgnr.get(b.orgnr), lista_id: lista.id, ...st })));
const utanId = stallen.filter(st => !st.bolag_id).length;
if (utanId) {
  console.error(`${utanId} arbetsställen fick inget bolags-id tillbaka. Avbryter.`);
  process.exit(1);
}
let m = 0;
for (let i = 0; i < stallen.length; i += 200) {
  const p = stallen.slice(i, i + 200);
  await sb('POST', 'prospekt_arbetsstalle?on_conflict=lista_id,cfar', p,
    'resolution=merge-duplicates,return=minimal');
  m += p.length;
  console.log(`  ... ${m}/${stallen.length} arbetsställen`);
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

console.log(`\nKlart. ${n} bolag och ${m} arbetsställen i ${slug}.`);
console.log(`  ${kedjor} bolag har fler än ett arbetsställe, ${koncerner} koncerner.`);
if (!lista.publicerad) console.log('Listan är INTE publicerad än. Kör om med --publicera.');
