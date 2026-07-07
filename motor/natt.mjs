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
import { extraheraLLM, klassificeraAvtalLLM } from './extract-llm.mjs';
import { FALT, bestamTyp } from './faltlistor.mjs';
import { renderBolag } from './render-bolag.mjs';

const p = rel => new URL(rel, import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const MODELL = process.env.MOTOR_MODELL || 'claude-haiku';

const konf = JSON.parse(readFileSync(p('./bolag.json'), 'utf8'));
const arkivFil = p('./in/arkiv.json');
const arkiv = existsSync(arkivFil) ? JSON.parse(readFileSync(arkivFil, 'utf8')) : {};
mkdirSync(p('./out/data'), { recursive: true });

let totKostnad = 0, totNya = 0;

for (const bolag of konf.bolag) {
  console.log(`\n=== ${bolag.namn} ===`);
  arkiv[bolag.id] = arkiv[bolag.id] || {};

  // 1. Upptäck: läs flödet, plocka länkar + rubriker.
  const feedHtml = await (await fetch(bolag.feed, { headers: { 'user-agent': 'Mozilla/5.0 (agarkollen-alpha)' } })).text();
  const lankar = [];
  const re = /href="(\/[a-z]+\/a\/[^"]+|https:\/\/mfn\.se\/[a-z]+\/a\/[^"]+)"/g;
  let m;
  while ((m = re.exec(feedHtml)) !== null) {
    const url = m[1].startsWith('http') ? m[1] : 'https://mfn.se' + m[1];
    if (!lankar.includes(url) && !url.endsWith('/a/' + bolag.id)) lankar.push(url);
  }
  const nya = lankar.filter(u => !arkiv[bolag.id][u]).slice(0, bolag.maxNya || 8);
  console.log(`  flödet: ${lankar.length} länkar, ${nya.length} nya att hämta`);

  // 2. Hämta + extrahera nya dokument.
  const dataFil = p(`./out/data/${bolag.id}.json`);
  const data = existsSync(dataFil) ? JSON.parse(readFileSync(dataFil, 'utf8')) : { id: bolag.id, namn: bolag.namn, dokument: [] };

  for (const url of nya) {
    const slug = url.split('/').pop();
    const typ = bestamTyp(slug);
    const namn = `${bolag.id}-${slug.slice(0, 60)}`;
    let post = { url, typ, rubrik: slug.replace(/-[a-f0-9]+$/, '').replace(/-/g, ' '), datum: new Date().toISOString().slice(0, 10) };
    try {
      const h = await hamta(url, namn);
      const text = readFileSync(h.fil, 'utf8');
      const rubrikRad = text.split('\n').find(r => r.trim().length > 25);
      if (rubrikRad) post.rubrik = rubrikRad.split('>').pop().trim().slice(0, 140);

      if (typ === 'avtal') {
        const r = await klassificeraAvtalLLM([{ id: 'pm1', text }], MODELL);
        const k = r.klassningar[0] || {};
        post.klass = k.klass; post.bevis = k.bevis; totKostnad += r.kostnad_usd;
      } else if (FALT[typ]) {
        const r = await extraheraLLM(text, FALT[typ], MODELL);
        post.fakta = r.fakta; post.kallor = r.kallor; post.anmarkningar = r.fel; totKostnad += r.kostnad_usd;
      }
      console.log(`  + ${typ.padEnd(9)} ${post.rubrik.slice(0, 70)}`);
    } catch (e) {
      post.fel = e.message;
      console.log(`  ! ${typ.padEnd(9)} ${slug.slice(0, 50)}: ${e.message.slice(0, 80)}`);
    }
    data.dokument.unshift(post);
    arkiv[bolag.id][url] = post.datum;
    totNya++;
  }

  // 3. Spara + rendera.
  data.uppdaterad = new Date().toISOString().slice(0, 16).replace('T', ' ');
  writeFileSync(dataFil, JSON.stringify(data, null, 1));
  writeFileSync(p(`./out/bolag-${bolag.id}.html`), renderBolag(data), 'utf8');
  console.log(`  sida: motor/out/bolag-${bolag.id}.html (${data.dokument.length} dokument totalt)`);
}

writeFileSync(arkivFil, JSON.stringify(arkiv, null, 1));
console.log(`\nKLART: ${totNya} nya dokument · kostnad $${totKostnad.toFixed(4)} · modell ${MODELL}`);
