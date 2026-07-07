// Nattjobbet: alphans dagliga körning.
// 1. Läser bevakningslistan (bolag.json).
// 2. Upptäcker nya pressmeddelanden i varje bolags MFN-flöde (arkivet minns sedda).
// 3. Hämtar, typbestämmer och kör LLM-extraktion/klassificering med citatkrav.
// 4. Sparar strukturerad data per bolag och renderar bolagssidor.
//
// Kör: node motor/natt.mjs            (kräver ANTHROPIC_API_KEY i miljön)
// Schemaläggning (Windows): se motor/README.md.

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { hamta } from './hamta.mjs';
import { extraheraLLM, klassificeraAvtalLLM, bestamTypLLM } from './extract-llm.mjs';
import { FALT, bestamTyp } from './faltlistor.mjs';
import { renderBolag } from './render-bolag.mjs';
import { renderDagsbrev } from './render-brev.mjs';
import { hittaTal } from './verify.mjs';
import { hamtaInsyn } from './hamta-insyn.mjs';
import { skicka } from './skicka.mjs';

const p = rel => new URL(rel, import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const MODELL = process.env.MOTOR_MODELL || 'claude-haiku';

const konf = JSON.parse(readFileSync(p('./bolag.json'), 'utf8'));
const arkivFil = p('./in/arkiv.json');
const arkiv = existsSync(arkivFil) ? JSON.parse(readFileSync(arkivFil, 'utf8')) : {};
mkdirSync(p('./out/data'), { recursive: true });

let totKostnad = 0, totNya = 0;
const dagensPoster = [], lugna = [];

for (const bolag of konf.bolag) {
  try {
  console.log(`\n=== ${bolag.namn} ===`);
  arkiv[bolag.id] = arkiv[bolag.id] || {};

  // 1. Upptäck: läs flödet, plocka artikellänkar. Mönstret kräver ett slug-segment
  // efter entiteten och täcker både /a/<bolag>/<slug> och /<wire>/a/<bolag>/<slug>.
  const feedHtml = await (await fetch(bolag.feed, { headers: { 'user-agent': 'Mozilla/5.0 (agarkollen-alpha)' } })).text();
  const lankar = [];
  const re = /href="((?:https:\/\/mfn\.se)?\/(?:[a-z]+\/)?a\/[a-z0-9-]+\/[^"/]+)"/g;
  let m;
  while ((m = re.exec(feedHtml)) !== null) {
    const url = m[1].startsWith('http') ? m[1] : 'https://mfn.se' + m[1];
    if (!lankar.includes(url)) lankar.push(url);
  }
  const nya = lankar.filter(u => !arkiv[bolag.id][u]).slice(0, bolag.maxNya || 8);
  console.log(`  flödet: ${lankar.length} länkar, ${nya.length} nya att hämta`);

  // 2. Hämta + extrahera nya dokument.
  const dataFil = p(`./out/data/${bolag.id}.json`);
  const data = existsSync(dataFil) ? JSON.parse(readFileSync(dataFil, 'utf8')) : { id: bolag.id, namn: bolag.namn, dokument: [] };

  const talSetts = [];
  for (const url of nya) {
    const slug = url.split('/').pop();
    let typ = bestamTyp(slug);
    const namn = `${bolag.id}-${slug.slice(0, 60)}`;
    let post = { url, typ, rubrik: slug.replace(/-[a-f0-9]+$/, '').replace(/-/g, ' '), datum: new Date().toISOString().slice(0, 10) };
    try {
      const h = await hamta(url, namn);
      const text = readFileSync(h.fil, 'utf8');
      const rubrikRad = text.split('\n').find(r => r.trim().length > 25);
      if (rubrikRad) post.rubrik = rubrikRad.split('>').pop().trim().slice(0, 140);

      // Språkdubbletter (SV+EN av samma besked): jämför dokumentets talmängd med
      // övriga i samma körning. Hög överlappning = samma nyhet, ingen LLM-kostnad.
      // Bara inom samma typ, och aldrig för rapport/kallelse/emission: en rapport
      // delar siffror med kvartalets övriga PM utan att vara en dubblett av dem.
      const tal = new Set(hittaTal(text).map(t => t.varde));
      const tvilling = talSetts.find(ts => {
        if (ts.typ !== typ || !['avtal', 'forvarv', 'ovrigt'].includes(typ)) return false;
        if (ts.tal.size < 5 || tal.size < 5) return false;
        let snitt = 0; for (const v of tal) if (ts.tal.has(v)) snitt++;
        return snitt / new Set([...tal, ...ts.tal]).size >= 0.6;
      });
      talSetts.push({ url, tal, typ });
      if (tvilling) {
        post.dublett_av = tvilling.url;
        console.log(`  = dublett   ${post.rubrik.slice(0, 66)}`);
      } else {

      // Slug-reglernas fallback är "avtal"; LLM:en typbestämmer de fallen billigt.
      if (typ === 'avtal') {
        const tl = await bestamTypLLM(text, MODELL);
        totKostnad += tl.kostnad_usd;
        if (tl.typ !== 'avtal') { typ = tl.typ; post.typ = typ; }
      }

      if (typ === 'avtal' || typ === 'forvarv') {
        const r = await klassificeraAvtalLLM([{ id: 'pm1', text }], MODELL);
        const k = r.klassningar[0] || {};
        post.klass = k.klass; post.bevis = k.bevis; totKostnad += r.kostnad_usd;
      } else if (FALT[typ]) {
        // Rapporter: PM-sammanfattningen saknar ofta fält som bara står i rapport-
        // PDF:en. Finns en PDF-bilaga läses den i stället (Claude läser PDF direkt).
        let pdfBase64 = null;
        if (typ === 'rapport' && h.pdfLankar && h.pdfLankar.length) {
          try {
            const hp = await hamta(h.pdfLankar[0], namn + '-bilaga');
            pdfBase64 = readFileSync(hp.fil).toString('base64');
            post.pdf_url = h.pdfLankar[0];
            console.log(`    (läser rapport-PDF: ${h.pdfLankar[0].split('/').pop()})`);
          } catch (e) { console.log(`    (PDF-bilagan kunde inte hämtas: ${e.message.slice(0, 60)})`); }
        }
        const r = await extraheraLLM(pdfBase64 ? null : text, FALT[typ], MODELL, { pdfBase64 });
        post.fakta = r.fakta; post.kallor = r.kallor; post.anmarkningar = r.fel; totKostnad += r.kostnad_usd;
      }
      console.log(`  + ${typ.padEnd(9)} ${post.rubrik.slice(0, 70)}`);
      }
    } catch (e) {
      post.fel = e.message;
      console.log(`  ! ${typ.padEnd(9)} ${slug.slice(0, 50)}: ${e.message.slice(0, 80)}`);
    }
    data.dokument.unshift(post);
    arkiv[bolag.id][url] = post.datum;
    totNya++;
    if (post.typ !== 'ovrigt' && !post.fel && !post.dublett_av) dagensPoster.push({ bolag: bolag.namn, post });
  }
  if (!nya.length || nya.every(u => false)) lugna.push(bolag.namn);
  else if (!dagensPoster.some(dp => dp.bolag === bolag.namn)) lugna.push(bolag.namn);

  // 3b. Insynsregistret (FI, öppen data): summeras per bolag; nya poster efter
  // baslinjen flaggas i dagsbrevet. Ingen LLM behövs, registret är strukturerat.
  try {
    const insyn = await hamtaInsyn(bolag.namn);
    writeFileSync(p(`./out/data/${bolag.id}-insyn.json`), JSON.stringify(insyn, null, 1));
    data.insyn = { netto_12m: insyn.netto_12m, antal_12m: insyn.transaktioner.length, senaste: insyn.transaktioner.slice(0, 5), kalla: insyn.kalla };
    const senastSedd = arkiv[bolag.id].__insyn;
    if (insyn.transaktioner[0]) arkiv[bolag.id].__insyn = insyn.transaktioner[0].pub;
    if (senastSedd) {
      for (const t of insyn.transaktioner.filter(t => t.pub > senastSedd).slice(0, 3)) {
        dagensPoster.push({ bolag: bolag.namn, post: { typ: 'insyn', datum: t.pub, url: 'https://marknadssok.fi.se/publiceringsklient', rubrik: `Insynshandel: ${t.karaktar} av ${t.befattning || t.person}`, bevis: `${t.person} (${t.befattning}) ${t.karaktar.toLowerCase()} ${t.volym} st à ${t.pris} ${t.valuta}, publicerat ${t.pub}` } });
      }
    }
    console.log(`  insyn: ${insyn.transaktioner.length} transaktioner 12 mån${senastSedd ? '' : ' (baslinje satt, nya flaggas från nästa körning)'}`);
  } catch (e) { console.log(`  insyn: kunde inte hämtas (${e.message.slice(0, 70)})`); }

  // 3. Spara + rendera.
  data.uppdaterad = new Date().toISOString().slice(0, 16).replace('T', ' ');
  writeFileSync(dataFil, JSON.stringify(data, null, 1));
  writeFileSync(p(`./out/bolag-${bolag.id}.html`), renderBolag(data), 'utf8');
  console.log(`  sida: motor/out/bolag-${bolag.id}.html (${data.dokument.length} dokument totalt)`);
  } catch (e) {
    console.log(`  BOLAGSFEL (${bolag.id}): ${e.message.slice(0, 120)} · hoppar vidare`);
  }
}

// Indexsidan: en rad per bolag.
const index = `<!doctype html><html lang="sv"><head><meta charset="utf-8"><title>Ägarkollen alpha</title>
<style>body{font-family:Georgia,serif;background:#F7F4EC;color:#211C17;max-width:560px;margin:40px auto;padding:0 20px}
a{color:#8A2E26} .m{font-family:monospace;font-size:11px;color:#8A8172}</style></head><body>
<h1>Ägarkollen · alpha</h1><p class="m">bevakade bolag · genererat ${new Date().toISOString().slice(0, 16).replace('T', ' ')}</p>
<ul>${konf.bolag.map(b => `<li><a href="bolag-${b.id}.html">${b.namn}</a></li>`).join('')}</ul>
<p class="m">Maskinläst, mänskligt ogranskad. Aldrig råd.</p></body></html>`;
writeFileSync(p('./out/index.html'), index, 'utf8');

writeFileSync(arkivFil, JSON.stringify(arkiv, null, 1));

// Dagsbrevet: renderas ur nattens fynd och mejlas om Resend-nyckel finns.
const datum = new Date().toISOString().slice(0, 10);
const brevHtml = renderDagsbrev({ datum, poster: dagensPoster, lugna });
const brevFil = p(`./out/brev-${datum}.html`);
writeFileSync(brevFil, brevHtml, 'utf8');
console.log(`\nDagsbrevet: ${brevFil} (${dagensPoster.length} poster, ${lugna.length} lugna bolag)`);

if (konf.utskick && process.env.RESEND_API_KEY) {
  try {
    const amne = `Ägarbrevet · ${dagensPoster.length} ${dagensPoster.length === 1 ? 'sak' : 'saker'} i dina bolag · ${datum}`;
    const r = await skicka({ till: konf.utskick.till, fran: konf.utskick.fran, amne, html: brevHtml });
    console.log(`Mejlat till ${konf.utskick.till.join(', ')} (id ${r.id})`);
  } catch (e) { console.log(`MEJLFEL: ${e.message.slice(0, 160)}`); }
} else {
  console.log('Mejl: RESEND_API_KEY saknas i miljön, brevet sparades bara lokalt.');
}

console.log(`\nKLART: ${totNya} nya dokument · kostnad $${totKostnad.toFixed(4)} · modell ${MODELL}`);
